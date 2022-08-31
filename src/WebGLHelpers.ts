
const createShader = (
    gl: WebGL2RenderingContext,
    type: number,
    source: string
) => {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error("Failed to create shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        console.error(source);
        let i = 1;
        for (const line of source.split("\n")) {
            console.log(i, line);
            i++;
        }
        throw new Error(gl.getShaderInfoLog(shader) || "unknown error");
    }
    return shader;
};

export const createFragmentProgram = (
    gl: WebGL2RenderingContext,
    fragmentSource: string
) => {
    const program = gl.createProgram();
    if (!program) {
        throw new Error("Failed to create program");
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
        ]),
        gl.STATIC_DRAW
    );

    const vertexShader = createShader(
        gl,
        gl.VERTEX_SHADER,
        `#version 300 es
        in vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0, 1);
        }
      `
    );

    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    return program;
};

export const createDataTexture = (gl: WebGL2RenderingContext, array: Float32Array, width: number, height: number) => {
    const texture = gl.createTexture();
    if (!texture) {
        throw new Error("Failed to create texture");
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        width,
        height,
        0,
        gl.RGBA,
        gl.FLOAT,
        array
    );

    return texture
}


export const createDoubleBufferTexture = (size: number, init: (i: number) => [number, number, number, number] | undefined, gl: WebGL2RenderingContext) => {
    const data = new Float32Array(
        size * size * 4
    );
    for (let i = 0; i < (size * size); i++) {
        const arr = init(i)
        if (!arr) {
            break
        }
        let O = i * 4 - 1;

        data[++O] = arr[0];
        data[++O] = arr[1];
        data[++O] = arr[2];
        data[++O] = arr[3];
    }

    let read = createDataTexture(
        gl,
        data,
        size,
        size
    );
    let write = createDataTexture(
        gl,
        data,
        size,
        size
    );

    return {
        getRead() {
            return read
        },
        getWrite() {
            return write
        },
        swap() {
            [read, write] = [write, read];
        }
    }
}