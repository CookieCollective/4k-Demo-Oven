#pragma hook declarations

#pragma data_seg(".var")
static GLuint vbo, vao;

static const constexpr int count = 100;
static const constexpr int sliceX = 100;
static const constexpr int sliceY = 1;
static const constexpr int faceX = sliceX + 1;
static const constexpr int faceY = sliceY + 1;
static const constexpr int indiceCount = count * ((faceX + 2) * faceY);		// count * line (+2 obfuscated triangle) * row
static const constexpr int vertexCount = count * (faceX * faceY) * (3 + 2); // count * line * row * (x,y,z + u,v)

static GLfloat vertices[vertexCount];
static int indices[indiceCount];

static const constexpr int textureCount = 1;
static GLuint textureIds[textureCount];

static unsigned int fbo;

#pragma hook initialize

int i = 0;
for (int index = 0; index < count; ++index)
{
	int xx = 0;
	for (int y = 0; y < faceY; ++y)
	{
		for (int x = 0; x < faceX; ++x)
		{
			vertices[index * (faceX * faceY) * (3 + 2) + xx * (3 + 2) + 0] = (float)index;
			vertices[index * (faceX * faceY) * (3 + 2) + xx * (3 + 2) + 1] = (float)index;
			vertices[index * (faceX * faceY) * (3 + 2) + xx * (3 + 2) + 2] = (float)index;
			vertices[index * (faceX * faceY) * (3 + 2) + xx * (3 + 2) + 3 + 0] = ((float)x / (float)sliceX) * 2.f - 1.f;
			vertices[index * (faceX * faceY) * (3 + 2) + xx * (3 + 2) + 3 + 1] = ((float)y / (float)sliceY) * 2.f - 1.f;
			xx++;
		}
	}
	for (int r = 0; r < faceY - 1; ++r)
	{
		indices[i++] = index * (faceX * faceY) + r * faceX;
		for (int c = 0; c < faceX; ++c)
		{
			indices[i++] = index * (faceX * faceY) + r * faceX + c;
			indices[i++] = index * (faceX * faceY) + (r + 1) * faceX + c;
		}
		indices[i++] = index * (faceX * faceY) + (r + 1) * faceX + (faceX - 1);
	}
}

glCreateBuffers(1, &vbo);
checkGLError();

glNamedBufferStorage(vbo, sizeof(vertices), vertices, 0);
checkGLError();
glCreateVertexArrays(1, &vao);
checkGLError();
glBindVertexArray(vao);
checkGLError();

glBindBuffer(GL_ARRAY_BUFFER, vbo);
checkGLError();

glEnableVertexAttribArray(0);
checkGLError();
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 5 * sizeof(GLfloat), 0);
checkGLError();

glEnableVertexAttribArray(1);
checkGLError();
glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 5 * sizeof(GLfloat), (GLvoid *)(3 * sizeof(GLfloat)));
checkGLError();

glGenTextures(textureCount, textureIds);
checkGLError();

for (i = 0; i < textureCount; i++)
{
	glBindTexture(GL_TEXTURE_2D, textureIds[i]);
	checkGLError();
	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, resolutionWidth, resolutionHeight, 0, GL_RGBA, GL_FLOAT, NULL);
	checkGLError();
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
	checkGLError();
	//glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
	//checkGLError();
}

glGenFramebuffers(1, &fbo);
checkGLError();

#pragma hook render

uniformTime = time;

// Pass 0

glBindFramebuffer(GL_FRAMEBUFFER, fbo);
checkGLError();

glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, textureIds[0], 0);
checkGLError();

glUseProgram(programs[0]);
checkGLError();

glUniform1fv(0, FLOAT_UNIFORM_COUNT, floatUniforms);
checkGLError();

glClear(GL_COLOR_BUFFER_BIT); // | GL_DEPTH_BUFFER_BIT);
checkGLError();

glEnable(GL_BLEND);
checkGLError();

glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
checkGLError();

glBindVertexArray(vao);
checkGLError();

glDrawElements(GL_TRIANGLE_STRIP, indiceCount, GL_UNSIGNED_INT, indices);
checkGLError();

// Pass 1

glBindFramebuffer(GL_FRAMEBUFFER, 0);
checkGLError();

glUseProgram(programs[1]);
checkGLError();

glUniform1fv(0, FLOAT_UNIFORM_COUNT, floatUniforms);
checkGLError();

glActiveTexture(GL_TEXTURE0 + 0);
checkGLError();

glBindTexture(GL_TEXTURE_2D, textureIds[0]);
checkGLError();

glUniform1i(3, 0);
checkGLError();

glRects(-1, -1, 1, 1);
checkGLError();
