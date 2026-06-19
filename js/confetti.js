const Confetti = {
    canvas: null,
    ctx: null,
    particles: [],
    colors: ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ce82ff'],
    animationId: null,

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '9999';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    fire() {
        if (!this.canvas) this.init();
        
        // Add new particles
        const count = 150;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: this.canvas.width / 2, // Shoot from center
                y: this.canvas.height / 2 + 100,
                r: Math.random() * 6 + 4,
                dx: Math.random() * 20 - 10,
                dy: Math.random() * -20 - 5,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                tilt: Math.floor(Math.random() * 10) - 10,
                tiltAngle: 0,
                tiltAngleInc: (Math.random() * 0.07) + 0.05
            });
        }
        
        if (!this.animationId) {
            this.animate();
        }
    },

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let remaining = false;
        
        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];
            p.tiltAngle += p.tiltAngleInc;
            p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
            p.x += Math.sin(p.tiltAngle) * 2;
            p.dy += 0.3; // gravity
            p.x += p.dx;
            p.y += p.dy;
            
            if (p.y <= this.canvas.height + 20) {
                remaining = true;
                this.ctx.beginPath();
                this.ctx.lineWidth = p.r;
                this.ctx.strokeStyle = p.color;
                this.ctx.moveTo(p.x + p.tilt + p.r, p.y);
                this.ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
                this.ctx.stroke();
            }
        }
        
        if (!remaining) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            this.particles = [];
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
};
