const FiveByFive = {

    // Better mathmatical modulo that works for negative numbers
    mod(x, n) {
        return ((x % n) + n) % n;
    },

    isBuildable(chunkX, chunkY, x, y) {
        // Only build on even chunks
        if(this.mod(chunkX, 2) !== 0 || this.mod(chunkY, 2) !== 0) return false;
        
        return true;

        // const x1 = x - 5;
        // const x2 = x + 5;
        // const y1 = y - 5;
        // const y2 = y + 5;

        // const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        // const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        // const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        // const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        // const lowest = Math.min(h11,h12,h21,h22);
        // const highest = Math.max(h11,h12,h21,h22);
        // const diff = highest - lowest;
        // if(diff > 7 || lowest < 0) return false;

        // return this.random(chunkX, chunkY) > 0.5 && this.random(chunkY, chunkX) > 0.5;
    },

    //Hash-based stable random number between 0 and 1
    random(x, y) {
        return Math.abs(Math.floor(x * 19349663 + y * 73856093)) % 100000 / 100000;
    },

    getRandomStyle(x, y) {
        const styleKeys = Object.keys(Structures.STYLES);
        //const hash = Math.abs(Math.floor(((x * 73856093) ^ (y * 19349663)) % 4294967296)) % styleKeys.length;
        const hash = Math.abs(((x * 73856093) ^ (y * 19349663))) % styleKeys.length;
        return Structures.STYLES[styleKeys[hash]];
    }, 

    

    /**
     * Create a house structure at the given center position, with optional size and style.
     * If style is not provided, a deterministic random style is chosen based on centerX and centerY.
     * @param {number} centerX
     * @param {number} centerY
     * @param {number} size
     * @param {object} style - One of Structures.STYLES
     * @returns {Array} Array of blocks
     */
    createHouse(xinit, yinit, size = 10, style = undefined) {
        // Deterministic style selection if not provided
        if (!style) {
            style = this.getRandomStyle(xinit, yinit);
            if(!style) {
                return [];
            }
        }
        const blocks = [];

        const x1 = xinit;
        const x2 = xinit + 4;
        const y1 = yinit;
        const y2 = yinit + 4;

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        const foundationZ = Math.max(h11,h12,h21,h22);

        //Create pillars to support elevated floor
        blocks.push(...Structures.createPillar(x1, y1, h11, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x1, y2, h12, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x2, y1, h21, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x2, y2, h22, foundationZ, style.pillar));

        // //create roof
         blocks.push(...Structures.createFloor(x1, y1, x2, y2, foundationZ + 4, style));

        //Grid
         //blocks.push(...Structures.createPillar(x1, y1, foundationZ, foundationZ + 4, style.pillar));
         //blocks.push(...Structures.createPillar(x1, y2, foundationZ, foundationZ + 4, style.pillar));
         //blocks.push(...Structures.createPillar(x2, y1, foundationZ, foundationZ + 4, style.pillar));
         //blocks.push(...Structures.createPillar(x2, y2, foundationZ, foundationZ + 4, style.pillar));

 
        //create walls  
        blocks.push(...Structures.createXWall(x1, x2, y1, foundationZ, false, true, style));
        blocks.push(...Structures.createXWall(x1, x2, y2, foundationZ, true, false, style));
        blocks.push(...Structures.createYWall(y1, y2, x1, foundationZ, true, false, style));
        blocks.push(...Structures.createYWall(y1, y2, x2, foundationZ, true, false, style));

        return blocks;
    },


    createCell(xinit, yinit, size = 10, style = undefined) {
        // Deterministic style selection if not provided
        if (!style) {
            style = this.getRandomStyle(xinit, yinit);
            if(!style) {
                return [];
            }
        }
        const blocks = [];

        //const sizeX = Math.floor(size * 1 * (1 + this.random(centerX + 10, centerY + 20)));
        //const sizeY = Math.floor(size * 1 * (1 + this.random(centerX + 100, centerY - 20)));

        const x1 = xinit;
        const x2 = xinit + 4;
        const y1 = yinit;
        const y2 = yinit + 4;

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        const foundationZ = Math.max(h11,h12,h21,h22);

        //Create pillars to support elevated floor
        blocks.push(...Structures.createPillar(x1, y1, h11, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x1, y2, h12, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x2, y1, h21, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(x2, y2, h22, foundationZ, style.pillar));

        // //create floor
         blocks.push(...Structures.createFloor(x1, y1, x2, y2, foundationZ, style));

        //Grid
         blocks.push(...Structures.createPillar(x1, y1, foundationZ, foundationZ + 24, style.pillar));
         blocks.push(...Structures.createPillar(x1, y2, foundationZ, foundationZ + 4, style.pillar));
         blocks.push(...Structures.createPillar(x2, y1, foundationZ, foundationZ + 4, style.pillar));
         blocks.push(...Structures.createPillar(x2, y2, foundationZ, foundationZ + 4, style.pillar));


        return blocks;
    },



};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.Houses = Houses;
} else {
    module.exports = Houses;
} 
