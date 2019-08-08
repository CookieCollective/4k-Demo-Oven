#pragma once

#include "demo.hpp"

struct StartServerOptions
{
	int port;
	GLint *programs;
};

void serverStart(const StartServerOptions &options);
void serverStop();

void serverUpdate();
