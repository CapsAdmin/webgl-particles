import { useCallback, useState } from "react";
import { defaultConfig, SimulationConfig } from "./Simulation";

let initialConfig = defaultConfig;
if (localStorage.getItem("config")) {
    try {
        const str = localStorage.getItem("config");
        if (!str) throw new Error("no config");
        const test = JSON.parse(str);
        if (test) {
            initialConfig = test;
        }
    } catch (err) {
        console.error(err);
    }
}

export const useSimulationConfig = () => {
    const search = window.location.search;
    const urlConfig = new URLSearchParams(search).get("config");
    if (urlConfig) {
        try {
            const test = JSON.parse(decodeURIComponent(atob(urlConfig)));
            if (test) {
                initialConfig = test;
            }
        } catch (err) {
            console.error(err);
        }
    }

    const [config, setConfig] = useState(initialConfig);

    const updateConfig = (newConfig: Partial<SimulationConfig>) => {
        const temp = { ...config, ...newConfig };
        setConfig(temp);
        const str = JSON.stringify(temp);
        localStorage.setItem("config", str);
    }

    return [config, updateConfig] as const
}