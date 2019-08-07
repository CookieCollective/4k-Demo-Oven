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
