# 4k Demo Oven

... with which you'll bake 4k demos for the [Cookie Demoparty](http://cookie.paris/) or other demoparties!

This framework originates from [iq](http://iquilezles.org) with some parts from [wsmind](https://github.com/wsmind), [halcy](https://github.com/halcy/), and maybe others.

Requirements:

- Windows only.
- [Crinkler](http://www.crinkler.net/) as linker.
- [Node.js](https://nodejs.org/) for the toolchain.
- [Synthclipse](http://synthclipse.sourceforge.net/) as IDE.
- [Visual Studio](https://www.visualstudio.com/) for the C++ compiler.

Recommended:

- [4klang](http://4klang.untergrund.net/) or [Oidos](https://github.com/askeksa/Oidos) as synthesizer.
- [7-Zip](https://www.7-zip.org/) to zip the demo.
- [Ffmpeg](https://www.ffmpeg.org/) to capture the demo into a video.
- [NASM](http://www.nasm.us) as ASM compiler, needed by the synthesizers.

## Setting up a new demo

Fork the repository on GitHub.

Clone your repository on your computer. I'll call XXX this directory's path.

Open a _VS x86 tools prompt_ and execute:

    cd XXX
    npm install --production

The demo settings are stored in _demo\config.yml_ for shared settings, and in _demo\config.local.yml_ for the settings specific to your computer. The latter file is ignored by git.

By default, tools are searched on the PATH. You can explicit them in _demo\config.local.yml_, for instance:

    paths:
      7z: C:\\Program Files\\7-Zip\\7z.exe
      crinkler: path\\to\\crinkler.exe
      oidos: path\\to\\oidos

The demo template uses Oidos as synthesizer. If you don't want to use it, set **demo:audioTool** as `none` in _demo\config.yml_.

In the _VS x86 tools prompt_, execute:

    gulp build

After a few seconds, the build should be successful, and running _dist\template.exe_ should display spinning balls. Quit by pressing escape.

If _7-Zip_ is installed and the path to _7z_ is available, the demo is zipped, together with the contents of _dist\static_.

Open Synthclipse. You are prompted to choose a workspace. This is where Synthclipse will store metadata about your projects within the IDE. If you have no particular needs, keeping the default value is fine.

Create a new Synthclipse project. Type in a title for your demo. **Uncheck** the default location, and choose _XXX\demo_. Click on _Finish_.

You're good to go. Take a cookie and start developping your demo.

Before releasing, check the demo's name in _config.yml_, update _static\file_id.diz_, and add some other files in _static_ if needed.

## Developing the demo

In Synthclipse, edit _shader.stoy_. This is your demo.

Click on the _Play_ button to compile the shader.

In order to automatically build when a file changes, execute in a _VS x86 tools prompt_:

    gulp watch

Whenever you save any fle in the project, a build is triggered in the background, and a notification displays the final size in bytes. Clicking on this notification will run the demo.

In Synthclipse, uniforms' values can be controlled thanks to comment annotations. [Have a look at the available controls.](http://synthclipse.sourceforge.net/user_guide/fragx/uniform_controls.html)

The framework embraces this feature and allows you to set values, which become constant values during the building process. For instance in the template project, `BPM` is adjustable through a uniform, but its value is hardcoded in the actual embedded shader.

Save the controls' values into a preset. By default, the framework will compile the values from the preset named `Default`.

The shader shall contain the line `// begin`. During the build process, the contents before the line is removed, and replaced by a generated block defining uniforms and consts as set in _config.yml_.

## Debugging & Minifying

You can enable debugging by adding the parameter _debug_ to the build process :

    gulp build --debug

It will add `#define DEBUG` in the engine code, which will display : openGL version, shader copile errors, uniform indices in console and/or message box.

If you don't want your shader to be minified, for debugging purpose, you can add the parameter _nominify_ :

    gulp build --debug --no-minify

## Usage of multiple buffers

If you wish to add multiple buffers feature, you can enable it by adding `demo:bufferCount: 3` in the config file to have 3 buffers.

The engine will execute multiple renders to texture, which you will be able to sample from your shader.
To do so, you will need to declare `uniform sampler2D buffer_n` as many time as there are buffers. As the uniform are not bind with the variable name but with their indices, your declaration will need to respect the order of the buffers (use _debug_ parameter to watch that uniforms indices are matching the code in _entry.cpp_).

Only one shader is used for the multiple buffer passes, the `uniform int PASSINDEX` will tells which passes is being rendered.
Only the last buffer pass will be displayed to the screen, the other ones will be rendered off-screen. (With 3 buffers, the displayed one will be code under the condition : `if (PASSINDEX == 2)`)

Additional notes :

- All buffers are the same size as the screen, but you can modify the code to suit you needs, as well as texture filtering, mipmaps...
- Render passes use dual buffers to allow simultaneous read/writing to the same pass.
- If you don't need multiple buffers but want to sample backbuffer (last frame) use : `demo:bufferCount: 1`
- If you don't need multiple buffers and don't need to sample backbuffer, use : `demo:bufferCount: 0`

## Audio tools

An audio tool can be set in the config file at `demo:audioTool`. `none` is a fallback tool which plays no music. The framework supports the following tools.

### [4klang](http://4klang.untergrund.net/)

Modular synthesizer by Dominik 'Gopher' Ries and Paul 'pOWL' Kraus of Alcatraz. It comes in two flavors: `4klang` and `8klang`, the latter is more powerful but takes more space.

[Getting started video](https://www.youtube.com/watch?v=wP__g_9FT4M)

Within the VST, record and export the song into the `demo` directory. This will generate `4klang.h` and `4klang.inc` files.

Give the path to _4klang_ or _8klang_ sources, in _config.local.yml_ as `paths:4klang` or `paths:8klang`. There shall be a file _4klang.asm_ inside.

### [Oidos](https://github.com/askeksa/Oidos)

Additive synthesizer by Aske Simon 'Blueberry' Christensen. Follow the [Pouet thread](http://www.pouet.net/prod.php?which=69524) for precompiled releases.

_Oidos_ converts the Renoise song into an assembly code. _Python 2_ is required for that. If `python` is not available in the PATH, give the path to it in _config.local.yml_ as `paths:python2`.

Give the path to _Oidos_ sources in _config.local.yml_ as `paths:oidos`. There shall be directories _convert_ and _player_ inside.

### Shader

Lets you make your own sound wave with a fragment shader. By default a 2048^2 pixels texture will be generated. At 44100, the whole texture can hold 190 seconds of sound. You can enable audio shader by setting the value of `demo:audioTool` to `shader` in the config file. See details of implementation in `shader.stoy`, `entry.cpp` and `audio-shader.cpp`.

## Capture

By default, the recording is done at 60 FPS at 1920x1080, including the audio from _music.wav_. Customize in _config.yml_.

Execute in a _VS x86 tools prompt_:

    gulp capture

The demo is built with the special capture settings, then runs while saving each frame on disk, and finally these frames are merged into a video in the _dist_ directory.

## Tips

Configure Synthclipse to compile the shader on save.

Use the beat time to be synchronized with the music, cf. `beat` in the template demo.

Have a look at _build\shader.glsl_ and _build\shader.min.glsl_ to understand how the shader is rewritten during the build process.

Add your own uniforms computed on CPU side.

Configure your antivirus to ignore XXX, because the demos may be recognized as viruses.

## Config reference

- `capture`: used for the capture only.
  - `audioFilename`: the rendered music in _demo_ which plays with the captured demo. Default `music.wav`. Set to `null` to disable audio.
  - `fps`: default `60`.
    _ `height`: default `1080`.
    _ `width`: default `1920`.
- `cl`: \* `args`: array of cli arguments.
- `crinkler`: \* `args`: array of cli arguments.
- `demo`:
  _ `audioFilename`: needed for some synthesizers.
  _ _Oidos_: default `music.xrns`.
  _ `audioTool`: `4klang`, `8klang`, `none`, `oidos`. Default `none`.
  _ `closeWhenFinished`: default `false`.
  _ `name`: used for the dist file names.
  _ `resolution`: used to force a resolution for dev purpose.
  _ `height`
  _ `scale` \* `width`
- `paths`: by default, applications are searched in the PATH.
  _ `4klang`: path to source directory, if using `4klang`.
  _ `7z`: recommended to zip the build.
  _ `8klang`: path to source directory, if using `8klang`.
  _ `crinkler`
  _ `ffmpeg`: for the capture.
  _ `nasm`
  _ `oidos`: path to source directory, if using `oidos`.
  _ `python2`: if using `oidos`.
- `shader`:
  _ `constantsPreset`: name of the preset used to transform uniforms to constants. Default `Default`.
  _ `filename`: default `shader.stoy`.
  _ `globals`: map type -> array of strings.
  _ `time`: used to provide the beat time. Set to `null` to disable. Automatically disabled if the beat const is not used.
  _ `beatConstant`: const name receiving the beat time. Default `beat`.
  _ `bpmUniform`: uniform name in Synthclipse stating the BPM. Default `BPM`. \* `uniforms`: array of strings. `time` is always prepended to the list.;

## Gulp task reference

Tasks:

- default: build and launch demo.
- `build`
- `capture`: compile in capture mode, then launch the demo, recording every frame.
- `clean`: clear generated files.
- `dev`: build and watch.
- `encode`: transform recorded frames into a mov file.
- `execute`: launch demo.
- `watch`: compile every time a file is changed.

Arguments:

- `debug`, `d`: compile in debug mode, default depends on the task.
- `directory`, `dir`: project path, defaults to `demo`.
- `minify`, `m`: minify shader, defaults to `true`.
- `notify`, `n`: show a notification when done, defaults to `false`.
- `server`, `s`: launch a server for hot-reload, defaults to `true`. Only works in debug mode.
- `zip`, `z`: zip the demo at the end, defaults to `false`. Requires [7-Zip](https://www.7-zip.org/download.html).
