'use strict';

const bounds = { width: 14, depth: 14 };
const offsets = { x: (bounds.width / 2), z: (bounds.depth / 2) };
const lanes = 3;
let lives = 5;
let points = 0;
let live_el = null;
let point_el = null;

function game_over() {
	alert('You Lose');
}

function score_points(p) {
	points += p;
	point_el.textContent = points;
}

class Frog {
	constructor() {
		const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
		const material = new THREE.MeshPhongMaterial({ color: 'green' });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.y = 0.25;
	}

	reset() {
		this.mesh.position.x = 0;
		this.mesh.position.z = 0;
	}

	die() {
		lives -= 1;
		live_el.textContent = lives;
		if (lives === 0)
			game_over();
		this.reset();
	}

	point() {
		score_points(1);
		this.reset();
	}
}

function same_pos(a, b) {
	return Math.abs(a.x - b.x) < 0.001
		&& Math.abs(a.z - b.z) < 0.125;
}

function random(min, max) {
	return min + Math.round(Math.random() * (max - min));
}

class Car {
	constructor() {
		const geometry = new THREE.BoxGeometry(1.5, 1, 0.5);
		const material = new THREE.MeshPhongMaterial({ color: 'cyan' });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.y = 0.75 / 2;
		this.reset();
		this.speed = 0.1;
	}

	reset() {
		this.mesh.position.x = -(bounds.width / 2) - random(1, 10);
		this.mesh.position.z = -random(1, lanes);
	}

	move() {
		this.mesh.position.x += this.speed;
		if (!this.within_bounds())
			this.reset();
	}

	within_bounds() {
		return this.mesh.position.x < bounds.width;
	}

	collides_with(position) {
		return same_pos(this.mesh.position, position);
	}
}

class Log {
	constructor() {
		this.width = random(3, 5);
		const geometry = new THREE.BoxGeometry(this.width, 0.3, 0.5);
		const material = new THREE.MeshPhongMaterial({ color: 'brown' });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.y = 0.2;
		this.reset();
	}

	move() {
		this.mesh.position.x -= this.speed;
		if (!this.within_bounds())
			this.reset();
	}

	within_bounds() {
		return this.mesh.position.x > -bounds.width;
	}

	reset() {
		this.speed = 0.01 + 0.01 * Math.random();
		this.mesh.position.x = (bounds.width / 2) + random(1, 10);
		this.mesh.position.z = -(5 + random(0, 5));
	}

	under(position) {
		return Math.abs(this.mesh.position.x - position.x) < this.width / 2
			&& Math.abs(this.mesh.position.z - position.z) < 0.125;
	}
}

class Turtles {
	constructor() {
		this.width = random(3, 5);
		const geometry = new THREE.BoxGeometry(this.width, 0.3, 0.5);
		const material = new THREE.MeshPhongMaterial({ color: 'white' });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.y = 0.2;
		this.submerged = false;
		this.reset();
	}

	submerge() {
		this.submerged = true;
		this.mesh.position.y = -1;
	}

	surface() {
		this.submerged = false;
		this.mesh.position.y = 0.2;
	}

	move() {
		this.mesh.position.x -= this.speed;
		if (!this.within_bounds())
			this.reset();
	}

	within_bounds() {
		return this.mesh.position.x > -bounds.width;
	}

	reset() {
		this.speed = 0.01 + 0.01 * Math.random();
		this.mesh.position.x = (bounds.width / 2) + random(1, 10);
		this.mesh.position.z = -(5 + random(0, 5));
	}

	under(position) {
		if (this.submerged)
			return false;
		return Math.abs(this.mesh.position.x - position.x) < this.width / 2
			&& Math.abs(this.mesh.position.z - position.z) < 0.125;
	}
}

class Road {
	constructor(lanes, row) {
		const geometry = new THREE.BoxGeometry(bounds.width * 3, 0.5, lanes);
		const material = new THREE.MeshPhongMaterial({ color: 'white' });
		this.lanes = lanes;
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.z = -(row - 0.5 + lanes / 2);
		this.cars = [new Car(), new Car(), new Car(), new Car(), new Car()];
	}
}

class River {
	constructor(lanes, row) {
		this.lanes = lanes;
		const geometry = new THREE.BoxGeometry(bounds.width * 3, 0.5, this.lanes);
		const material = new THREE.MeshPhongMaterial({ color: 'blue' });

		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.z = -(row - 0.5 + this.lanes / 2);
		this.logs = [
			new Log(), new Log(), new Log(),
			new Log(), new Log(), new Log(),
			new Log(), new Log(), new Log(),
		];
		this.turtles = [
			new Turtles(), new Turtles(), new Turtles(),
			new Turtles(), new Turtles(), new Turtles(),
			new Turtles(), new Turtles(), new Turtles(),
		];
	}

	in_river(position) {
		if (Math.abs(this.mesh.position.z - position.z) > this.lanes / 2)
			return false;

		return !this.logs.some(l => l.under(position))
			&& !this.turtles.some(t => t.under(position));
	}
}

class Sidewalk {
	constructor(row, flies) {
		const geometry = new THREE.BoxGeometry(bounds.width * 3, 0.5, 1);
		const material = new THREE.MeshPhongMaterial({ color: 'grey' });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.z = -row;
		this.mesh.position.y = 0.001;
		this.flies = [];
		for (let i = 0; i < flies; ++i)
			this.flies.push(new Fly(row))
	}
}

class Fly {
	constructor(row) {
		this.row = row;
		this.column = 0;
		this.visible = false;

		const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
		const material = new THREE.MeshPhongMaterial({ color: 'grey' });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.z = -row;
		this.reset();
	}

	reset() {
		this.column = random(0, bounds.width) - (bounds.width / 2);
		this.mesh.position.x = this.column;
		this.hide();
	}

	show() {
		this.visible = true;
		this.mesh.position.y = 0.75;
	}

	hide() {
		this.visible = false;
		this.mesh.position.y = -1;
	}
}

class Grass {
	constructor(row) {
		const width = 5;
		const geometry = new THREE.BoxGeometry(bounds.width * 3, 0.5, width);
		const material = new THREE.MeshPhongMaterial({ color: 'lightgreen' });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.z = -(row - 0.5 + width / 2);
		this.mesh.position.y = 0.001;
	}
}
function main() {
	const canvas = document.querySelector('#canvas');
	point_el = document.querySelector('#points');
	live_el = document.querySelector('#lives');
	point_el.textContent = points;
	live_el.textContent = lives;
	const renderer = new THREE.WebGLRenderer({antialias: true, canvas});

	const fov = 75;
	const aspect = 2;  // the canvas default
	const near = 0.1;
	const far = 20;
	const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	camera.position.y = 1;

	const light = new THREE.DirectionalLight(0xFFFFFF, 1);
	light.position.z = 1;

	const scene = new THREE.Scene();
	scene.add(light);

	const frog = new Frog();
	const road = new Road(lanes, 1);
	const sidewalks = [new Sidewalk(0, 0), new Sidewalk(4, 3)];
	const river = new River(5, 5);
	const grass = new Grass(10);

	scene.add(frog.mesh);
	scene.add(road.mesh);
	road.cars.forEach(c => scene.add(c.mesh));
	sidewalks.forEach(s => {
		scene.add(s.mesh);
		s.flies.forEach(f => scene.add(f.mesh));
	});
	scene.add(river.mesh);
	scene.add(grass.mesh);
	river.logs.forEach(l => scene.add(l.mesh));
	river.turtles.forEach(t => scene.add(t.mesh));

	const gameloop = () => {
		if (lives <= 0)
			return;

		sidewalks.forEach(s => {
			s.flies.forEach(f => {
				if (Math.random() > 0.99)
					{
						if (f.visible)
							f.reset();
						else
							f.show();
					}
			});
		});

		road.cars.forEach(car => {
			car.move();
			if (car.collides_with(frog.mesh.position))
				frog.die();
		});

		river.logs.forEach(log => {
			log.move();
			if (log.under(frog.mesh.position))
				frog.mesh.position.x -= log.speed;
		});

		river.turtles.forEach(turtle => {
			turtle.move();
			if (turtle.under(frog.mesh.position))
				frog.mesh.position.x -= turtle.speed;

			if (Math.random() > 0.99)
				{
					if (turtle.submerged)
						turtle.surface();
					else
						turtle.submerge();
				}
		});

		if (river.in_river(frog.mesh.position))
			frog.die();


		if (frog.mesh.position.x < -(bounds.width / 2))
			frog.die();

	}

	setInterval(gameloop, 1000 / 60);

	const backward = function() {
		if (frog.mesh.position.z < 0) {
			frog.mesh.position.z = Math.round(frog.mesh.position.z + 1);
			frog.mesh.position.x = Math.round(frog.mesh.position.x);
		}
	}
	const forward = function() {
		if (frog.mesh.position.z > -bounds.depth) {
			frog.mesh.position.z = Math.round(frog.mesh.position.z - 1);
			frog.mesh.position.x = Math.round(frog.mesh.position.x);
		}
	}

	const left = function() {
		if (frog.mesh.position.x > -(bounds.width / 2)) {
			frog.mesh.position.x = Math.round(frog.mesh.position.x - 1);
			frog.mesh.position.z = Math.round(frog.mesh.position.z);
		}
	}

	const right = function() {
		if (frog.mesh.position.x < (bounds.width / 2)) {
			frog.mesh.position.x = Math.round(frog.mesh.position.x + 1);
			frog.mesh.position.z = Math.round(frog.mesh.position.z);
		}
	}

	const animate = function() {
		if (lives <= 0)
			return;

		requestAnimationFrame(animate);

		camera.position.x = frog.mesh.position.x;
		camera.position.z = frog.mesh.position.z + 1.5;

		renderer.render(scene, camera);
	}

	window.addEventListener('keydown', (e) => {
		switch (e.key) {
		case 'ArrowUp':
			forward();
			break;
		case 'ArrowDown':
			backward();
			break;
		case 'ArrowLeft':
			left();
			break;
		case 'ArrowRight':
			right();
			break;
		}

		if (frog.mesh.position.z <= -10)
			frog.point();

		sidewalks.forEach(s => {
			s.flies.forEach(f => {
				if (same_pos(f.mesh.position, frog.mesh.position)) {
					score_points(0.5);
					f.reset();
				}
			});
		});
	});

	animate();
}
window.onload = main;
