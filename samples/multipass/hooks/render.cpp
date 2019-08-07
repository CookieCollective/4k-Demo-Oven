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
