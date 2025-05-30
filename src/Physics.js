const Physics = {
    checkCollision(position, terrainHeight) {
        // Check collision at feet level
        return (position.z - player.height) <= terrainHeight;
    },
    
    applyGravity(velocity, delta = 0.01) {
        return velocity - delta;
    },

    calculateMovement(currentPos, velocity, rotation, speed) {
        // Forward vector
        const forwardX = Math.sin(rotation.y);
        const forwardY = Math.cos(rotation.y);
        
        // Right vector (perpendicular to forward)
        const rightX = Math.sin(rotation.y + Math.PI / 2);
        const rightY = Math.cos(rotation.y + Math.PI / 2);
        
        // Calculate movement by combining forward/backward (velocity.y) and strafe (velocity.x)
        const moveX = (forwardX * velocity.y + rightX * velocity.x) * speed;
        const moveY = (forwardY * velocity.y + rightY * velocity.x) * speed;
        
        return {
            x: currentPos.x + moveX,
            y: currentPos.y + moveY,
            z: currentPos.z
        };
    }
};

// Support both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.Physics = Physics;
} else {
    module.exports = Physics;
} 