// https://docs.microsoft.com/en-us/windows/win32/http/http-server-sample-application

#define UNICODE
#define _WIN32_WINNT 0x0600
#define WIN32_LEAN_AND_MEAN

#include <windows.h>
#include <http.h>
#include <iostream>
#include <memory>

#include "server.hpp"

#include "debug.hpp"

#define INITIALIZE_HTTP_RESPONSE(resp, status, reason) \
	do                                                 \
	{                                                  \
		RtlZeroMemory((resp), sizeof(*(resp)));        \
		(resp)->StatusCode = (status);                 \
		(resp)->pReason = (reason);                    \
		(resp)->ReasonLength = (USHORT)strlen(reason); \
	} while (FALSE)

#define ADD_KNOWN_HEADER(Response, HeaderId, RawValue)               \
	do                                                               \
	{                                                                \
		(Response).Headers.KnownHeaders[(HeaderId)].pRawValue =      \
			(RawValue);                                              \
		(Response).Headers.KnownHeaders[(HeaderId)].RawValueLength = \
			(USHORT)strlen(RawValue);                                \
	} while (FALSE)

#define ALLOC_MEM(cb) HeapAlloc(GetProcessHeap(), 0, (cb))

#define FREE_MEM(ptr) HeapFree(GetProcessHeap(), 0, (ptr))

static HANDLE hReqQueue = NULL;
static HANDLE hCompletionPort = NULL;
static StartServerOptions options;

struct Buffer
{
	char *data = nullptr;
	std::size_t length = 0;

	~Buffer()
	{
		free();
	}

	bool alloc(std::size_t _length)
	{
		data = new char[_length];
		length = _length;
		return data != nullptr;
	}

	bool realloc(std::size_t length)
	{
		free();
		return alloc(length);
	}

	void free()
	{
		delete[] data;
	}
};

std::ostream &operator<<(std::ostream &os, const Buffer &buffer)
{
	os << "[" << buffer.length << "]";
	os.write(buffer.data, buffer.length);
	return os;
}

struct Context : OVERLAPPED
{
	Buffer requestBuffer;
	HANDLE hFile;

	bool initialize()
	{
		return requestBuffer.alloc(sizeof(HTTP_REQUEST) + 2048);
	}

	const PHTTP_REQUEST getRequest() const
	{
		return reinterpret_cast<PHTTP_REQUEST>(requestBuffer.data);
	}
};

static Context context;

static ULONG initializeAsyncReceive(HTTP_REQUEST_ID requestId = 0)
{
	RtlZeroMemory(&context, sizeof(OVERLAPPED));

	ULONG result = HttpReceiveHttpRequest(
		hReqQueue,					  // Req Queue
		requestId,					  // Req ID
		0,							  // Flags
		context.getRequest(),		  // HTTP request buffer
		context.requestBuffer.length, // req buffer length
		nullptr,					  // bytes received
		&context					  // LPOVERLAPPED
	);

	return result;
}

static std::unique_ptr<Buffer> readBody(const HTTP_REQUEST *pRequest)
{
	ULONG result;

	std::unique_ptr<Buffer> totalBuffer{new Buffer{0}};

	ULONG EntityBufferLength = 2048;
	PUCHAR pEntityBuffer = (PUCHAR)ALLOC_MEM(EntityBufferLength);

	if (pEntityBuffer == NULL)
	{
		wprintf(L"Insufficient resources.\n");
		return totalBuffer;
	}

	ULONG BytesRead;

	if (pRequest->Flags & HTTP_REQUEST_FLAG_MORE_ENTITY_BODY_EXISTS)
	{
		for (;;)
		{
			BytesRead = 0;
			result = HttpReceiveRequestEntityBody(
				hReqQueue,
				pRequest->RequestId,
				0,
				pEntityBuffer,
				EntityBufferLength,
				&BytesRead,
				NULL);

			switch (result)
			{
			case NO_ERROR:
			case ERROR_HANDLE_EOF:
				if (BytesRead != 0)
				{
					std::unique_ptr<Buffer> newTotalBuffer{new Buffer};
					if (newTotalBuffer->alloc(totalBuffer->length + BytesRead))
					{
						memcpy(newTotalBuffer->data, totalBuffer->data, totalBuffer->length);
						memcpy(newTotalBuffer->data + totalBuffer->length, pEntityBuffer, BytesRead);
						totalBuffer.swap(newTotalBuffer);
					}
				}
				if (result == ERROR_HANDLE_EOF)
				{
					return totalBuffer;
				}
				break;

			default:
				wprintf(L"HttpReceiveRequestEntityBody failed with %lu.\n", result);
				return totalBuffer;
			}
		}
	}

	return totalBuffer;
}

static DWORD SendHttpResponse(
	const HTTP_REQUEST *pRequest,
	USHORT StatusCode,
	const char *pReason,
	const char *pEntityString)
{
	HTTP_RESPONSE response;
	HTTP_DATA_CHUNK dataChunk;
	DWORD result;
	DWORD bytesSent;

	INITIALIZE_HTTP_RESPONSE(&response, StatusCode, pReason);
	ADD_KNOWN_HEADER(response, HttpHeaderContentType, "text/html");

	if (pEntityString)
	{
		dataChunk.DataChunkType = HttpDataChunkFromMemory;
		dataChunk.FromMemory.pBuffer = const_cast<char *>(pEntityString);
		dataChunk.FromMemory.BufferLength = (ULONG)strlen(pEntityString);

		response.EntityChunkCount = 1;
		response.pEntityChunks = &dataChunk;
	}

	result = HttpSendHttpResponse(
		hReqQueue,
		pRequest->RequestId,
		0,
		&response,
		NULL,
		&bytesSent,
		NULL,
		0,
		NULL,
		NULL);

	if (result != NO_ERROR)
	{
		wprintf(L"HttpSendHttpResponse failed with %lu \n", result);
	}

	return result;
}

static void handleRequest(const HTTP_REQUEST *pRequest)
{
	ULONG result;

	switch (pRequest->Verb)
	{
	case HttpVerbGET:
		result = SendHttpResponse(pRequest, 404, "Not Found", nullptr);
		break;

	case HttpVerbPOST:
		int passIndex;
		wchar_t shaderStage[16];
		if (swscanf_s(pRequest->CookedUrl.pAbsPath, L"/passes/%d/%s", &passIndex, shaderStage, sizeof(shaderStage)) == 2)
		{
			if (passIndex < PASS_COUNT)
			{
				auto body = readBody(pRequest);
				GLint lengths[] = {(GLint)body->length};

				if (!wcscmp(shaderStage, L"fragment"))
				{
					std::cout << "Setting new fragment shader for pass " << passIndex << ":" << std::endl;
					std::cout << *body << std::endl;

					GLint shader = debugFragmentShaders[passIndex];
					checkGLError();
					glShaderSource(shader, 1, &body->data, lengths);
					checkGLError();
					glCompileShader(shader);
					checkShaderCompilation(shader);
					glLinkProgram(options.programs[passIndex]);
					checkGLError();

					result = SendHttpResponse(pRequest, 200, "OK", nullptr);
				}
				else if (!wcscmp(shaderStage, L"vertex"))
				{
					std::cout << "Setting new vertex shader for pass " << passIndex << ":" << std::endl;
					std::cout << *body << std::endl;

					GLint shader = debugVertexShaders[passIndex];
					checkGLError();
					glShaderSource(shader, 1, &body->data, lengths);
					checkGLError();
					glCompileShader(shader);
					checkShaderCompilation(shader);
					glLinkProgram(options.programs[passIndex]);
					checkGLError();

					result = SendHttpResponse(pRequest, 200, "OK", nullptr);
				}
				else
				{
					result = SendHttpResponse(pRequest, 404, "Not Found", nullptr);
				}
			}
			else
			{
				result = SendHttpResponse(pRequest, 404, "Not Found", nullptr);
			}
		}
		else
		{
			result = SendHttpResponse(pRequest, 404, "Not Found", nullptr);
		}
		break;

	default:
		result = SendHttpResponse(pRequest, 404, "Not Found", nullptr);
		break;
	}

	if (result != NO_ERROR)
	{
		std::cerr << "Error handling request: 0x" << std::hex << result << "." << std::endl;
	}
}

void serverUpdate()
{
	ULONG result;
	DWORD bytesRead;
	ULONG_PTR pKey;
	LPOVERLAPPED pOverlapped;

	if (GetQueuedCompletionStatus(hCompletionPort, &bytesRead, &pKey, &pOverlapped, 0))
	{
		result = ERROR_SUCCESS;
	}
	else
	{
		result = GetLastError();
	}

	switch (result)
	{
	case WAIT_TIMEOUT:
		// Fine.
		break;

	case ERROR_SUCCESS:
	{
		auto context = reinterpret_cast<Context *>(pOverlapped);

		handleRequest(context->getRequest());

		initializeAsyncReceive();
		break;
	}

	case ERROR_MORE_DATA:
	{
		auto requestId = context.getRequest()->RequestId;

		if (!context.requestBuffer.realloc(bytesRead))
		{
			result = ERROR_NOT_ENOUGH_MEMORY;
			break;
		}

		initializeAsyncReceive(requestId);
		break;
	}

	default:
		std::cerr << "GetQueuedCompletionStatus error 0x" << std::hex << result << "." << std::endl;
		break;
	}
}

static wchar_t urlBuffer[256];

void serverStart(const StartServerOptions &_options)
{
	options = _options;

	ULONG retCode = HttpInitialize(HTTPAPI_VERSION_1, HTTP_INITIALIZE_SERVER, NULL);

	if (retCode != NO_ERROR)
	{
		wprintf(L"HttpInitialize failed with %lu.\n", retCode);
		return;
	}

	retCode = HttpCreateHttpHandle(&hReqQueue, 0);

	if (retCode != NO_ERROR)
	{
		wprintf(L"HttpCreateHttpHandle failed with %lu.\n", retCode);
	}

	swprintf_s(urlBuffer, sizeof(urlBuffer), L"http://localhost:%d/", options.port);

	retCode = HttpAddUrl(hReqQueue, urlBuffer, NULL);

	if (retCode != NO_ERROR)
	{
		wprintf(L"HttpAddUrl failed with %lu.\n", retCode);
		return;
	}

	hCompletionPort = CreateIoCompletionPort(hReqQueue, nullptr, 0, 2);

	context.initialize();

	initializeAsyncReceive();
}

void serverStop()
{
	HttpRemoveUrl(hReqQueue, urlBuffer);

	if (hCompletionPort)
	{
		CloseHandle(hCompletionPort);
	}

	if (hReqQueue)
	{
		CloseHandle(hReqQueue);
	}

	HttpTerminate(HTTP_INITIALIZE_SERVER, NULL);
}
