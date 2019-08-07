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
