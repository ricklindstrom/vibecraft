const FiveByFive = {

    //variable to control the size of the building cells
    ENABLE_WALLS : true,
    ENABLE_GRID : true,
    ENABLE_ROOF : false,
    ENABLE_CELL_ROOF : true,

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

        return true;
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


    createBuilding(xinit, yinit, xsize = 3, ysize = 3, floors = 3, style = undefined, atrium = 1) {
        const blocks = [];

        if (!style) {
            style = this.getRandomStyle(xinit, yinit);
            if(!style) {
                return [];
            }
        }
        let cellSize = 4;
       
        //Get the highest point of the terrain around the building
        const h11 = TerrainGenerator.getTerrainHeight(xinit, yinit);
        const h12 = TerrainGenerator.getTerrainHeight(xinit, yinit + ysize * cellSize);
        const h21 = TerrainGenerator.getTerrainHeight(xinit + xsize * cellSize, yinit);
        const h22 = TerrainGenerator.getTerrainHeight(xinit + xsize * cellSize, yinit + ysize * cellSize);
        let foundationZ = Math.max(h11,h12,h21,h22) + 1;

        // create pillars to support elevated floor
        blocks.push(...Structures.createPillar(xinit, yinit, h11, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(xinit, yinit + ysize * cellSize, h12, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(xinit + xsize * cellSize, yinit, h21, foundationZ, style.pillar));
        blocks.push(...Structures.createPillar(xinit + xsize * cellSize, yinit + ysize * cellSize, h22, foundationZ, style.pillar));

        // create initial floor
        blocks.push(...Structures.createFloor(xinit, yinit, xinit + xsize * cellSize, yinit + ysize * cellSize, foundationZ, style));

        for(let f = 0; f < floors; f++) {
            //create roof for current floor
            //This creates one giant floor for the whole area (Which we might not want?)
            if(this.ENABLE_ROOF) {
                blocks.push(...Structures.createFloor(xinit, yinit, xinit + xsize * cellSize, yinit + ysize * cellSize, foundationZ + ((f + 1) * cellSize), style));
            }

            for(let x = 0; x < xsize; x++) {
                for(let y = 0; y < ysize; y++) {

                    let xdist = Math.min(x, xsize - x - 1);
                    let ydist = Math.min(y, ysize - y - 1);
 
                    //Create a door at the corner of the building on the ground floor
                    if(x== 0 && y == 0 && f==0) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "dw++", cellSize, style));
                        continue
                    }
                    
                    if(x == 0) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "+w+ ", cellSize, style));
                    }
                    if(y == 0) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "w+ +", cellSize, style));
                    }
                    if(x == xsize-1) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "+ +w", cellSize, style));
                    }
                    if(y == ysize-1) {
                        blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), " +w+", cellSize, style));
                    }

                    if (atrium > 0) {
                        if(x > 0 && xdist < atrium) {
                            blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "    ", cellSize, style));
                        }
                        if(y > 0 && ydist < atrium) {
                            blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "    ", cellSize, style));
                        }

                        if(x == atrium && ydist > atrium) {
                            blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "+ +A", cellSize, style));
                        }
                        if(y == atrium && xdist > atrium) {
                            blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), " +A+", cellSize, style));
                        }


                        if(x < xsize-1 && xdist < atrium) {
                            blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "    ", cellSize, style));
                        }
                        if(y > ysize-1 && ydist < atrium) {
                            blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "    ", cellSize, style));
                        }

                        if(x == xsize - 1 - atrium && ydist > atrium) {
                            blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "+d+ ", cellSize, style));
                        }
                        if(y == ysize - 1 - atrium && xdist > atrium) {
                            blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "d+ +", cellSize, style));
                        }
                    }

                    //Battlements (this should probably be a separate reusable method)
                    // if(f === floors - 1) {
                    //     if(x == 0) {
                    //         blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), " b  ", cellSize, style));
                    //     }
                    //     if(y == 0) {
                    //         blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "b   ", cellSize, style));
                    //     }
                    //     if(x == xsize-1) {
                    //         blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "   b", cellSize, style));
                    //     }
                    //     if(y == ysize-1) {
                    //         blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), foundationZ + (f * cellSize), "  b ", cellSize, style));
                    //     }
                    // }        
                    
                }
            }
        }

        blocks.push(...this.createRoof(xinit, yinit, xinit + xsize * cellSize, yinit + ysize * cellSize, foundationZ + ((floors + 2) * cellSize), style));

        //TODO If there is no atrium we can add a roof to the whole building using the roof style

        return blocks;
    },


    createRoof(xinit, yinit, xend, yend, z, style = Structures.STYLES.STONE) {
        const blocks = [];

        if(!this.ENABLE_ROOF) {
            return [];
        }

        if (!style) {
            style = this.getRandomStyle(xinit, yinit);
            if(!style) {
                return [];
            }
        }
        let cellSize = 4;

        let xsize = Math.floor((xend - xinit) / cellSize);
        let ysize = Math.floor((yend - yinit) / cellSize);

        //Put battlements on roof
        for(let x = 0; x < xsize; x++) {
            for(let y = 0; y < ysize; y++) {
                if(x == 0) {
                    blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), z, " b  ", cellSize, style));
                }
                if(y == 0) {
                    blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), z, "b   ", cellSize, style)); 
                }
                if(x == xsize-1) {
                    blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), z, "   b", cellSize, style));
                }
                if(y == ysize-1) {
                    blocks.push(...this.createCell(xinit + (x * cellSize), yinit + (y * cellSize), z, "  b ", cellSize, style));
                }
            }
        }

        return blocks;
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
    createHouse(xinit, yinit, code = "dwww", size = 4, style = undefined) {
        // Deterministic style selection if not provided
        if (!style) {
            style = this.getRandomStyle(xinit, yinit);
            if(!style) {
                return [];
            }
        }
        const blocks = [];

        const x1 = xinit;
        const x2 = xinit + size - 1;
        const y1 = yinit;
        const y2 = yinit + size - 1;

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
        blocks.push(...Structures.createFloor(x1, y1, x2, y2, foundationZ + size - 1, style));

        //Grid
        if(this.ENABLE_GRID) {
            if(["W", "w", "D", "d", "+"].includes(code[0])) {
                blocks.push(...Structures.createPillar(x1, y1, foundationZ, foundationZ + size - 1, style.pillar));
            }
            if(["W", "w", "D", "d", "+"].includes(code[1])) {
                blocks.push(...Structures.createPillar(x2, y1, foundationZ, foundationZ + size - 1, style.pillar));
            }
            if(["W", "w", "D", "d", "+"].includes(code[2])) {    
                blocks.push(...Structures.createPillar(x2, y2, foundationZ, foundationZ + size - 1, style.pillar));
            }
            if(["W", "w", "D", "d", "+"].includes(code[3])) {
            blocks.push(...Structures.createPillar(x1, y2, foundationZ, foundationZ + size - 1, style.pillar));
            }
        }

         if(!this.ENABLE_WALLS) {
            return blocks;
         }

        //Walls
        if(["W", "w", "D", "d"].includes(code[0])) {
            blocks.push(...Structures.createXWall(x1 + 1, x2 - 1, y1, foundationZ, code[0] == 'w', code[0] == 'd', style));
        }

        if(["W", "w", "D", "d"].includes(code[1])) {
            blocks.push(...Structures.createYWall(y1 + 1, y2 - 1, x1, foundationZ, code[1] == 'w', code[1] == 'd', style));
        }

        if(["W", "w", "D", "d"].includes(code[2])) {
            blocks.push(...Structures.createXWall(x1 + 1, x2 - 1, y2, foundationZ, code[2] == 'w', code[2] == 'd', style));
        }

        if(["W", "w", "D", "d"].includes(code[3])) {
            blocks.push(...Structures.createYWall(y1 + 1, y2 - 1, x2, foundationZ, code[3] == 'w', code[3] == 'd', style));
        }


        return blocks;
    },

    createCell(xinit, yinit, foundationZ = undefined, code = "wwww", size = 4, style = undefined) {

        if (!style) {
            // Deterministic style selection if not provided
            style = this.getRandomStyle(xinit, yinit);
            if(!style) {
                return [];
            }
        }
        const blocks = [];


        const x1 = xinit;
        const x2 = xinit + size;
        const y1 = yinit;
        const y2 = yinit + size;

        const h11 = TerrainGenerator.getTerrainHeight(x1, y1);
        const h12 = TerrainGenerator.getTerrainHeight(x1, y2);
        const h21 = TerrainGenerator.getTerrainHeight(x2, y1);
        const h22 = TerrainGenerator.getTerrainHeight(x2, y2);

        if(!foundationZ) {
            foundationZ = Math.max(h11,h12,h21,h22);
        }

        // //Create pillars to support elevated floor
        // blocks.push(...Structures.createPillar(x1, y1, h11, foundationZ, style.pillar));
        // blocks.push(...Structures.createPillar(x1, y2, h12, foundationZ, style.pillar));
        // blocks.push(...Structures.createPillar(x2, y1, h21, foundationZ, style.pillar));
        // blocks.push(...Structures.createPillar(x2, y2, h22, foundationZ, style.pillar));

        // // //create floor or roof
        if(this.ENABLE_CELL_ROOF) {
            blocks.push(...Structures.createFloor(x1, y1, x2, y2, foundationZ + size, style));
        }

        //Grid
        if(this.ENABLE_GRID) {
            if(["W", "w", "D", "d", "A", "+"].includes(code[0])) {
                blocks.push(...Structures.createPillar(x1, y1, foundationZ, foundationZ + size - 1, style.trim));
            }
            if(["W", "w", "D", "d", "A", "+"].includes(code[1])) {
                blocks.push(...Structures.createPillar(x2, y1, foundationZ, foundationZ + size - 1, style.trim));
            }   
            if(["W", "w", "D", "d", "A", "+"].includes(code[2])) {    
                blocks.push(...Structures.createPillar(x2, y2, foundationZ, foundationZ + size - 1, style.trim));
            }
            if(["W", "w", "D", "d", "A", "+"].includes(code[3])) {
            blocks.push(...Structures.createPillar(x1, y2, foundationZ, foundationZ + size - 1, style.trim));
            }
        }

    if(this.ENABLE_WALLS) {
            //create walls
            if(["W", "w", "D", "d"].includes(code[0])) {
                blocks.push(...this.createXWall(x1 + 1, x2 - 1, y1, foundationZ, code[0], style));
            }
            if(["W", "w", "D", "d"].includes(code[1])) {
                blocks.push(...this.createYWall(y1 + 1, y2 - 1, x1, foundationZ, code[1], style));
            }
            if(["W", "w", "D", "d"].includes(code[2])) {
                blocks.push(...this.createXWall(x1 + 1, x2 - 1, y2, foundationZ, code[2], style));
            }
            if(["W", "w", "D", "d"].includes(code[3])) {
                blocks.push(...this.createYWall(y1 + 1, y2 - 1, x2, foundationZ, code[3], style));
            }

            //create walls
            if(["A"].includes(code[0])) {
                blocks.push(...this.createXWall(x1 + 1, x2 - 1, y1, foundationZ, code[0], style));
            }
            if(["A"].includes(code[1])) {
                blocks.push(...this.createYWall(y1 + 1, y2 - 1, x1, foundationZ, code[1], style));
            }
            if(["A"].includes(code[2])) {
                blocks.push(...this.createXWall(x1 + 1, x2 - 1, y2, foundationZ, code[2], style));
            }
            if(["A"].includes(code[3])) {
                blocks.push(...this.createYWall(y1 + 1, y2 - 1, x2, foundationZ, code[3], style));
            }
    }

    if(this.ENABLE_CELL_ROOF) {
        let z = foundationZ + size + 1;
        if(["b"].includes(code[0])) {
            blocks.push({ x: x1, y: y1, z: z, type: style.wall });
            blocks.push({ x: x1 + 2, y: y1, z: z, type: style.wall });
            blocks.push({ x: x1 + 4, y: y1, z: z, type: style.wall });
        }
        if(["b"].includes(code[1])) {
            blocks.push({ x: x1, y: y1, z: z, type: style.wall });
            blocks.push({ x: x1, y: y1 + 2, z: z, type: style.wall });
            blocks.push({ x: x1, y: y1 + 4, z: z, type: style.wall });
        }
        if(["b"].includes(code[2])) {
            blocks.push({ x: x1, y: y2, z: z, type: style.wall });
            blocks.push({ x: x1 + 2, y: y2, z: z, type: style.wall });
            blocks.push({ x: x1 + 4, y: y2, z: z, type: style.wall });
        }
        if(["b"].includes(code[3])) {
            blocks.push({ x: x2, y: y1, z: z, type: style.wall });
            blocks.push({ x: x2, y: y1 + 2, z: z, type: style.wall });
            blocks.push({ x: x2, y: y1 + 4, z: z, type: style.wall });
        }
    }

        return blocks;
    },

    createXWall(x1, x2, y, foundationZ, panelType="W", style = Structures.STYLES.STONE) {
        const blocks = [];

        let column = 0;
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            let row = 0;
            for (let z = foundationZ; z < foundationZ + 3; z++) {
                let cell = this.getPanelCell(row, column, panelType);
                if(cell !== " ") {
                    blocks.push({ x, y, z: foundationZ + row + 1, type: style.wall });
                }
                row++;
            }
            column++;
        }
        return blocks;
    },

    createYWall(y1, y2, x, foundationZ, panelType="W", style = Structures.STYLES.STONE) {
        const blocks = [];

        let column = 0;
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            let row = 0;
            for (let z = foundationZ; z < foundationZ + 3; z++) {
                let cell = this.getPanelCell(row, column, panelType);
                if(cell !== " ") {
                    blocks.push({ x, y, z: foundationZ + row + 1, type: style.wall });
                }
                row++;
            }
            column++;
        }
        return blocks;
    },

    getPanelCell(row, column, panelType="W") {
        let pattern = this.getPanelPattern(panelType);

        //if the requested cell is outside the pattern, return an empty cell
        if(row < 0 || row >= pattern.length || column < 0 || column >= pattern[row].length) {
            return "W"; //Temporary return a wall to diagnose problems
        }
        return pattern[row][column];
    },

    getPanelPattern(panelType="W") {
        if(panelType === "W") { return ["WWW", "WWW", "WWW"]; } // Wall
        if(panelType === "w") { return ["WWW", "W W", "WWW"]; } // Wall with window
        if(panelType === "D") { return ["W W", "W W", "WWW"]; } // Door
        if(panelType === "d") { return ["W W", "W W", "WWW"]; } // Door
        if(panelType === "A") { return ["   ", "   ", "W W"]; } // Arch
        if(panelType === "b") { return [" W ", "   ", "   "]; } // Battlements (not really useful yet)
        if(panelType === "B") { return ["WWW", " W ", "   "]; } // Higher battlement (not really useful yet)
        console.log("Unknown panel type: " + panelType);
        if(panelType === " ") { return ["   ", "   ", "   "]; } // Empty (Shouldn't actually be requested?)
        return ["WWW", "W W", "WWW"]; // Default
    },
};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.Houses = Houses;
} else {
    module.exports = Houses;
} 
