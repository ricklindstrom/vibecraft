const Houses = {

    // Better mathmatical modulo that works for negative numbers
    mod(x, n) {
        return ((x % n) + n) % n;
    },

    isBuildable(chunkX, chunkY, x, y) {
        // Only build on even chunks
        if(this.mod(chunkX, 2) !== 0 || this.mod(chunkY, 2) !== 0) return false;
        
        const x1 = x - 5;
        const x2 = x + 5;
        const y1 = y - 5;
        const y2 = y + 5;

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        const lowest = Math.min(h11,h12,h21,h22);
        const highest = Math.max(h11,h12,h21,h22);
        const diff = highest - lowest;
        if(diff > 7 || lowest < 0) return false;

        return this.random(chunkX, chunkY) > 0.5 && this.random(chunkY, chunkX) > 0.5
    },

    //Hash-based stable random number between 0 and 1 (NOT VERY GOOD?)
    random(x, y) {
        return Math.abs(Math.floor(x * 19349663 + y * 73856093)) % 100000 / 100000;
    },

    getRandomStyle(x, y) {
        const styleKeys = Object.keys(Structures.STYLES);
        const crazynum = Math.abs((x & 0xFFFF) * 73856093 + (y & 0xFFFF) * 19349663);
        const hash = (crazynum & 0xFFFFFFFF) % styleKeys.length;
        return Structures.STYLES[styleKeys[hash]];
    },

    /**
     * Create a house structure at the given center position, with optional size and style.
     * If style is not provided, a deterministic random style is chosen based on centerX and centerY.
     * @param {number} centerX
     * @param {number} centerY
     * @param {number} size
     * @param {object} style - One of Structures.STYLES
     * @returns {Structure}
     */
    createHouse(centerX, centerY, size = 10, style = undefined) {
        const blocks = [];

        if (!style) {
            style = this.getRandomStyle(centerX, centerY);
            if(!style) {
                return blocks;
            }
        }

        const sizeX = Math.floor(size * 1 * (1 + this.random(centerX + 10, centerY + 20)));
        const sizeY = Math.floor(size * 1 * (1 + this.random(centerX + 100, centerY - 20)));

        const x1 = centerX - Math.floor(sizeX / 2);
        const x2 = centerX + Math.floor(sizeX / 2);
        const y1 = centerY - Math.floor(sizeY / 2);
        const y2 = centerY + Math.floor(sizeY / 2);

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        const foundationZ = Math.max(h11,h12,h21,h22);
        const porch = 4;

        //Create pillars to support elevated floor
        blocks.push(...Structures.createPillar(x1, y1, h11, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x1, y2, h12, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x2, y1, h21, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x2, y2, h22, foundationZ, style.pillar));

        //create floor
        blocks.push(...Structures.createFloor(x1, y1 - porch, x2, y2, foundationZ, style.floor));
        
        //create walls  
        blocks.push(...Structures.createXWall(x1, x2, y1, foundationZ, false, true, style));
        blocks.push(...Structures.createXWall(x1, x2, y2, foundationZ, true, false, style));
        blocks.push(...Structures.createYWall(y1, y2, x1, foundationZ, true, false, style));
        blocks.push(...Structures.createYWall(y1, y2, x2, foundationZ, true, false, style));

        //create roof
        if(style.roofType === 'PYRAMID') {
            blocks.push(...Structures.createPyramidRoof(x1, y1, x2, y2, foundationZ + Structures.wallHeight + 1, style.roof));
        } else if(style.roofType === 'FLAT') {
            blocks.push(...Structures.createFloor(x1, y1, x2, y2, foundationZ + Structures.wallHeight + 1, style.roof));
        } else if(style.roofType === 'STORY') {
            blocks.push(...Structures.createHouse(x1, y1, x2, y2, foundationZ + Structures.wallHeight + 1, style.roof));
        }

        return blocks;
    },


};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.Houses = Houses;
} else {
    module.exports = Houses;
} 
