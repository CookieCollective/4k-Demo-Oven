#version 450
precision mediump float;

uniform float time;
uniform float resolutionWidth;
uniform float resolutionHeight;

uniform sampler2D audioTexture;

#pragma fragment 0

vec2 generateAudioSample(float t) {
	vec2 results = vec2(0, 0);
	results.x = sin(t * 1200.0 + 1000.0 * sin(t * 0.2));
	results.y = sin(t * 1500.0 + 1000.0 * sin(t * 0.2));
	results *= sin(t * 400.0 + 20.0 * sin(t * 11.5));
	return results;
}

void mainF0() {
	float t = 2.0 * ((gl_FragCoord.x - 0.5) + (gl_FragCoord.y - 0.5) * 2048.0) / 44100.0;
	gl_FragColor.xy = generateAudioSample(t);
	gl_FragColor.zw = generateAudioSample(t + (1.0 / 44100.0));
}

#pragma fragment 1

void mainF1() {
	vec2 uv = gl_FragCoord.xy / vec2(resolutionWidth, resolutionHeight) - 0.5;
	uv.y += sin(uv.x * 100.0 + time) * 0.02;
	float t = time * 0.1 + uv.x;
	vec4 audioSample = texture(audioTexture, vec2(mod(t, 2048.0), floor(t / 2048.0)));
	float diff = abs(audioSample.x - 2.5 * uv.y);
	float color = step(diff, 0.1);
	gl_FragColor = vec4(color);
}
