import * as fflate from 'fflate';
import { useState } from "react";
import { defaultExample } from "./examples/default";

let initialConfig = defaultExample;
if (localStorage.getItem("config")) {
    try {
        const str = localStorage.getItem("config");
        if (!str) throw new Error("no config");
        if (typeof str == "string") {
            initialConfig = str;
        }
    } catch (err) {
        console.error(err);
    }
}

function str2ab(str: string) {
    const bufView = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return bufView;
}

function ab2str(uarr: Uint8Array): string {
    let str = '';
    for (let i = 0; i < uarr.length; i++) {
        str += String.fromCharCode(uarr[i]);
    }

    return str;
}

export const encodeConfig = (data: string) => {
    const msgpackEncoded = str2ab(data)
    const deflated = fflate.deflateSync(msgpackEncoded, { level: 9, mem: 12 })
    const uri = ab2str(deflated)
    return uri
}
export const decodeConfig = (deflated: string) => {
    const msgpackEncoded = fflate.inflateSync(str2ab(deflated))
    const data = ab2str(msgpackEncoded)
    return data
}

export const useSimulationCode = () => {
    const search = window.location.search;
    const urlCode = new URLSearchParams(search).get("c");
    if (urlCode) {
        try {
            const test = decodeConfig(atob(urlCode));
            if (test) {
                initialConfig = test;
            }
        } catch (err) {
            console.error(err);
        }
    }

    const [code, setCode] = useState(initialConfig);

    const saveCode = (newCode: Partial<string>) => {
        setCode(newCode);
        localStorage.setItem("config", newCode);
    }

    return [code, saveCode] as const
}