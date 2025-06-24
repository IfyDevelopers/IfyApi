import { fileURLToPath } from 'url';
import { dirname } from 'path';

export function getDirname(importMetaUrl: string) {
    return dirname(fileURLToPath(importMetaUrl));
}

export function getDirnameUp(importMetaUrl: string, levels = 1) {
    let dir = getDirname(importMetaUrl);
    for (let i = 0; i < levels; i++) {
        dir = dirname(dir);
    }
    return dir;
}
