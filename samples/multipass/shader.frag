#version 450
precision mediump float;

uniform float time;
uniform float resolutionWidth;
uniform float resolutionHeight;

uniform sampler2D firstPassTexture;

const float PI = 3.14;//! replace

vec4 _gl_Position;
#define gl_Position _gl_Position

#pragma attributes

vec3 aPosition;
vec2 aUV;

#pragma varyings

vec3 vColor;

#pragma outputs

vec4 color;

#pragma common

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, - s, s, c); }

vec3 curve(float ratio) {
	ratio += time;
	vec3 position = vec3(0.5 + 0.3 * sin(ratio), 0, 0);
	position.xz *= rot(ratio);
	position.yz *= rot(ratio * 0.58);
	position.yx *= rot(ratio * 1.5);
	return position;
}

#pragma vertex 0

void mainV0() {
	vec3 position = aPosition;
	float ratio = aUV.x * 0.5 + position.x * 2.0;
	float i = position.x;
	position = curve(ratio);
	vec3 next = curve(ratio + 0.01);
	vec2 y = normalize(next.xy - position.xy);
	vec2 x = vec2(y.y, - y.x);
	position.xy += x * aUV.y * (0.01 + 0.01 * position.z);
	gl_Position = vec4(position.xy, 0.0, 1.0);
	vColor = vec3(aUV.xy * 0.5 + 0.5, 0);
}

#pragma fragment 0

void mainF0() {
	float fade = smoothstep(0.0, 0.5, vColor.x);
	fade *= (1.0 - abs(vColor.x * 2.0 - 1.0));
	color = vec4(1, 1, 1, fade);
}

#pragma fragment 1

void mainF1() {
	vec2 uv = gl_FragCoord.xy / vec2(resolutionWidth, resolutionHeight);
	color = 1.0 - texture(firstPassTexture, uv);
}
