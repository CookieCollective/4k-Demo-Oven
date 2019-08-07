#pragma once

#include <demo-gl.hpp>

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

static void initialization()
{
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
	glNamedBufferStorage(vbo, sizeof(vertices), vertices, 0);
	glNamedBufferSubData(vbo, 0, sizeof(vertices), vertices);
	glCreateVertexArrays(1, &vao);
	glBindVertexArray(vao);

	glBindBuffer(GL_ARRAY_BUFFER, vbo);

	glEnableVertexAttribArray(0);
	glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 5 * sizeof(GLfloat), 0);

	glEnableVertexAttribArray(1);
	glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 5 * sizeof(GLfloat), (GLvoid *)(3 * sizeof(GLfloat)));

	glBindVertexArray(0);
}

static void render()
{
	glClear(GL_COLOR_BUFFER_BIT); // | GL_DEPTH_BUFFER_BIT);
	glEnable(GL_BLEND);
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

	glBindVertexArray(vao);
	glDrawElements(GL_TRIANGLE_STRIP, indiceCount, GL_UNSIGNED_INT, indices);
}
