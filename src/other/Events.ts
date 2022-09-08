export const mouseEvents = (canvas: HTMLCanvasElement) => {
    let mx = 0;
    let my = 0;
    let pressed = 0;
    const mouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mx = e.clientX - rect.left;
        my = e.clientY - rect.top;
        mx = mx / rect.width;
        my = my / rect.height;
        mx = mx * 2 - 1;
        my = my * 2 - 1;

        my = -my;

    };
    window.addEventListener("mousemove", mouseMove);

    const mouseDown = (e: MouseEvent) => {
        pressed = e.buttons === 4 ? -1 : 1;
    };
    window.addEventListener("mousedown", mouseDown);

    const mouseUp = (e: MouseEvent) => {
        pressed = 0;
    };
    window.addEventListener("mouseup", mouseUp);

    const destroy = () => {
        window.removeEventListener("mousemove", mouseMove);
        window.removeEventListener("mousedown", mouseDown);
        window.removeEventListener("mouseup", mouseUp);
    }

    const read = () => {
        return [mx, my, pressed] as const;
    }

    return [read, destroy] as const;
}

export const renderLoop = (onRender: (dt: number) => void) => {
    let stop = false;

    let lastUpdate = Date.now() / 1000;

    const update = () => {
        if (stop) return;

        const dt = Date.now() / 1000 - lastUpdate
        onRender(dt)
        let stopTime = (Date.now() / 1000)
        lastUpdate = stopTime;
        requestAnimationFrame(update);
    }

    update()

    return () => {
        stop = true;
    }
}