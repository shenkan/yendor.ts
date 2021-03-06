/// <reference path="persistence.ts" />
module Game {
	"use strict";

	export class Tile {
		explored: boolean = false;
		scentAmount: number = 0;
	}

	export class AbstractDungeonBuilder {
		private dungeonLevel: number;
		constructor(dungeonLevel: number) {
			this.dungeonLevel = dungeonLevel;
		}

		protected dig( map: Map, x1: number, y1: number, x2: number, y2: number ) {
			if ( x2 < x1 ) {
				var tmp: number = x2;
				x2 = x1;
				x1 = tmp;
			}
			if ( y2 < y1 ) {
				var tmp2: number = y2;
				y2 = y1;
				y1 = tmp2;
			}
			for (var tilex: number = x1; tilex <= x2; tilex++) {
				for (var tiley: number = y1; tiley <= y2; tiley++) {
					map.setFloor(tilex, tiley);
				}
			}
		}

		protected createRoom( map: Map, first: boolean, x1: number, y1: number, x2: number, y2: number ) {
			this.dig( map, x1, y1, x2, y2 );
			if ( first ) {
				// put the player and stairs up in the first room
				var player: Actor = ActorManager.instance.getPlayer();
				var stairsUp: Actor = ActorManager.instance.getStairsUp();
				player.x = Math.floor((x1 + x2) / 2);
				player.y = Math.floor((y1 + y2) / 2);
				stairsUp.x = player.x;
				stairsUp.y = player.y;
			} else {
				var rng: Yendor.Random = new Yendor.ComplementaryMultiplyWithCarryRandom();
				this.createMonsters(x1, y1, x2, y2, rng, map);
				this.createItems(x1, y1, x2, y2, rng, map);
				// stairs down will be in the last room
				var stairsDown: Actor = ActorManager.instance.getStairsDown();
				stairsDown.x = Math.floor((x1 + x2) / 2);
				stairsDown.y = Math.floor((y1 + y2) / 2);
			}
		}

		/*
			Function: getValueForDungeon
			Get a value adapted to current dungeon level.
			Parameters:
			steps: array of (dungeon level, value) pairs 
		*/
		private getValueForDungeon(steps: number[][]): number {
			var nbSteps = steps.length;
			for (var step = nbSteps - 1; step >= 0; step --) {
				if ( this.dungeonLevel >= steps[step][0] ) {
					return steps[step][1];
				}
			}
			return 0;
		}

		private createMonster(x: number, y: number, rng: Yendor.Random) {
			// no trolls before level 3. then probability 10/(60+30+10)=0.1 until level 5, 
			// 20/(60+30+20)=0.18 until level 7 and 30/(60+30+30)=0.23 beyond
			var monster = rng.getRandomChance({
				"goblin": 60,
				"orc": 30,
				"troll": this.getValueForDungeon([[3, 10], [5, 20], [7, 30]])
			});
			if ( monster === "goblin" ) {
				return Actor.createBeast(x, y, "g", "goblin", "goblin corpse", "#3F7F3F", 3, 1, 0, 10);
			} else if ( monster === "orc" ) {
				return Actor.createBeast(x, y, "o", "orc", "dead orc", "#3F7F3F", 9, 2, 0, 35);
			} else if ( monster === "troll" ) {
				return Actor.createBeast(x, y, "T", "troll", "troll carcass", "#007F00", 15, 3, 1, 100);
			}
			return undefined;
		}

		private createItem(x: number, y: number, rng: Yendor.Random) {
			var item = rng.getRandomChance({
				"healthPotion": 40,
				"lightningBoltScroll": this.getValueForDungeon([[3, 10]]),
				"fireballScroll": 10,
				"confusionScroll": 10,
				"bone arrow": 10,
				"iron arrow": 10,
				"bolt": 10,
				"short bow": this.getValueForDungeon([[5, 4]]),
				"long bow": this.getValueForDungeon([[8, 4]]),
				"crossbow": this.getValueForDungeon([[5, 4]]),
				"short sword": this.getValueForDungeon([[5, 4], [12, 0]]),
				"wooden shield": this.getValueForDungeon([[8, 8], [12, 0]]),
				"longsword": this.getValueForDungeon([[10, 4]]),
				"iron shield": this.getValueForDungeon([[14, 8]]),
				"greatsword": this.getValueForDungeon([[14, 4]])
			});
			if ( item === "healthPotion" ) {
				return Actor.createHealthPotion(x, y, 4);
			} else if ( item === "lightningBoltScroll" ) {
				return Actor.createLightningBoltScroll(x, y, 5, 20);
			} else if ( item === "fireballScroll" ) {
				return Actor.createFireballScroll(x, y, 3, 12);
			} else if ( item === "confusionScroll") {
				return Actor.createConfusionScroll(x, y, 5, 12);
			} else if ( item === "bone arrow") {
				return Actor.createMissile(x, y, "bone arrow", 1, "arrow");
			} else if ( item === "iron arrow") {
				return Actor.createMissile(x, y, "iron arrow", 1.5, "arrow");
			} else if ( item === "bolt") {
				return Actor.createMissile(x, y, "bolt", 1, "bolt");
			} else if ( item === "short bow") {
				return Actor.createBow(x, y, "short bow", 3, "arrow", true);
			} else if ( item === "long bow") {
				return Actor.createBow(x, y, "long bow", 5, "arrow", true);
			} else if ( item === "crossbow") {
				return Actor.createBow(x, y, "crossbow", 2, "bolt");
			} else if ( item === "short sword") {
				return Actor.createSword(x, y, "short sword", 4);
			} else if ( item === "wooden shield") {
				return Actor.createShield(x, y, "wooden shield", 1);
			} else if ( item === "longsword") {
				return Actor.createSword(x, y, "longsword", 6);
			} else if ( item === "iron shield") {
				return Actor.createShield(x, y, "iron shield", 2);
			} else if ( item === "greatsword") {
				return Actor.createSword(x, y, "greatsword", 8, true);
			}
			return undefined;
		}

		private createMonsters(x1: number, y1: number, x2: number, y2: number, rng: Yendor.Random, map: Map) {
			var monsterCount = rng.getNumber(0, Constants.MAX_MONSTERS_PER_ROOM);
			while ( monsterCount > 0 ) {
				var x = rng.getNumber(x1, x2);
				var y = rng.getNumber(y1, y2);
				if ( map.canWalk(x, y)) {
					ActorManager.instance.addCreature(this.createMonster(x, y, rng));
				}
				monsterCount --;
			}
		}

		private createItems(x1: number, y1: number, x2: number, y2: number, rng: Yendor.Random, map: Map) {
			var itemCount = rng.getNumber(0, Constants.MAX_ITEMS_PER_ROOM);
			while ( itemCount > 0 ) {
				var x = rng.getNumber(x1, x2);
				var y = rng.getNumber(y1, y2);
				if ( map.canWalk(x, y)) {
					ActorManager.instance.addItem(this.createItem(x, y, rng));
				}
				itemCount --;
			}
		}

	}

	export class BspDungeonBuilder extends AbstractDungeonBuilder {
		private roomNum: number = 0;
		private lastx: number;
		private lasty: number;
		constructor(dungeonLevel: number) {
			super(dungeonLevel);
		}

		private visitNode: (node: Yendor.BSPNode, userData: any) => Yendor.BSPTraversalAction
			= function(node: Yendor.BSPNode, userData: any) {
			var dungeonBuilder: BspDungeonBuilder = userData[0];
			var map: Map = userData[1];
			if ( node.isLeaf() ) {
				var x, y, w, h: number;
				var rng: Yendor.Random = new Yendor.ComplementaryMultiplyWithCarryRandom();
				w = rng.getNumber(Constants.ROOM_MIN_SIZE, node.w);
				h = rng.getNumber(Constants.ROOM_MIN_SIZE, node.h);
				x = rng.getNumber(node.x, node.x + node.w - w);
				y = rng.getNumber(node.y, node.y + node.h - h);
				dungeonBuilder.createRoom( map, dungeonBuilder.roomNum === 0, x, y, x + w - 1, y + h - 1 );
				if ( dungeonBuilder.roomNum !== 0 ) {
					// build a corridor from previous room
					dungeonBuilder.dig(map, dungeonBuilder.lastx, dungeonBuilder.lasty,
						Math.floor(x + w / 2), dungeonBuilder.lasty);
					dungeonBuilder.dig(map, Math.floor(x + w / 2), dungeonBuilder.lasty,
						Math.floor(x + w / 2), Math.floor(y + h / 2));
				}
				dungeonBuilder.lastx = Math.floor(x + w / 2);
				dungeonBuilder.lasty = Math.floor(y + h / 2);
				dungeonBuilder.roomNum++;
			}
			return Yendor.BSPTraversalAction.CONTINUE;
		};

		build(map : Map) {
			var bsp: Yendor.BSPNode = new Yendor.BSPNode( 0, 0, map.width, map.height );
			bsp.splitRecursive(undefined, 8, Constants.ROOM_MIN_SIZE, 1.5 );
			bsp.traverseInvertedLevelOrder( this.visitNode, [this, map] );
		}
	}

	export class Map implements Persistent {
		className: string;
		private tiles: Tile[][];
		private map: Yendor.Fov;
		private _currentScentValue: number = Constants.SCENT_THRESHOLD;
		private _width: number;
		private _height: number;

		constructor() {
			this.className = "Map";
		}

		init(_width: number, _height: number) {
			this._width = _width;
			this._height = _height;
			this.tiles = [];
			this.map = new Yendor.Fov(_width, _height);
			for (var x = 0; x < this._width; x++) {
				this.tiles[x] = [];
				for (var y = 0; y < this._height; y++) {
					this.tiles[x][y] = new Tile();
				}
			}
		}

		get width() { return this._width; }
		get height() { return this._height; }
		get currentScentValue() { return this._currentScentValue; }

		isWall(x: number, y: number): boolean {
			return !this.map.isWalkable(x, y);
		}

		canWalk(x: number, y: number): boolean {
			if ( this.isWall(x, y) ) {
				return false;
			}
			var actorsOnCell: Actor[] = ActorManager.instance.findActorsOnCell(new Yendor.Position(x, y), ActorManager.instance.getItems());
			actorsOnCell = actorsOnCell.concat(ActorManager.instance.findActorsOnCell(
				new Yendor.Position(x, y), ActorManager.instance.getCreatures()));
			for ( var i: number = 0; i < actorsOnCell.length; i++) {
				var actor: Actor = actorsOnCell[i];
				if ( actor.isBlocking() ) {
					return false;
				}
			}
			return true;
		}

		contains(x: number, y: number): boolean {
			return x >= 0 && y >= 0 && x < this.width && y < this.height;
		}

		isExplored(x: number, y: number): boolean {
			return this.tiles[x][y].explored;
		}

		isInFov(x: number, y: number): boolean {
			if ( this.map.isInFov(x, y) ) {
				this.tiles[x][y].explored = true;
				return true;
			}
			return false;
		}

		shouldRenderActor(actor: Actor): boolean {
			return this.isInFov( actor.x, actor.y)
				|| (!actor.isFovOnly() && this.isExplored( actor.x, actor.y));
		}

		getScent(x: number, y: number): number {
			return this.tiles[x][y].scentAmount;
		}

		computeFov(x: number, y: number, radius: number) {
			this.map.computeFov(x, y, radius);
			this._currentScentValue ++;
			this.updateScentField(x, y);
		}

		setFloor(x: number, y: number) {
			this.map.setCell(x, y, true, true);
		}
		setWall(x: number, y: number) {
			this.map.setCell(x, y, false, false);
		}

		render() {
			for (var x = 0; x < this._width; x++) {
				for (var y = 0; y < this._height; y++) {
					if ( this.isInFov(x, y) ) {
						root.back[x][y] = this.isWall(x, y) ? Constants.LIGHT_WALL : Constants.LIGHT_GROUND;
					} else if ( this.isExplored(x, y) ) {
						root.back[x][y] = this.isWall(x, y) ? Constants.DARK_WALL : Constants.DARK_GROUND;
					} else {
						root.back[x][y] = "black";
					}
				}
			}
		}

		// Persistent interface
		load(jsonData: any): boolean {
			this._width = jsonData._width;
			this._height = jsonData._height;
			this.map = new Yendor.Fov(this._width, this._height);
			this.tiles = [];
			for (var x = 0; x < this._width; x++) {
				this.tiles[x] = [];
				for (var y = 0; y < this._height; y++) {
					this.tiles[x][y] = new Tile();
					this.tiles[x][y].explored = jsonData.tiles[x][y].explored;
					this.tiles[x][y].scentAmount = jsonData.tiles[x][y].scentAmount;
					this.map.setCell(x, y, jsonData.map._walkable[x][y], jsonData.map._transparent[x][y]);
				}
			}
			return true;
		}

		private updateScentField(xPlayer: number, yPlayer: number) {
			for (var x: number = 0; x < this._width; x++) {
		        for (var y: number = 0; y < this._height; y++) {
		            if (this.isInFov(x, y)) {
		                var oldScent: number = this.getScent(x, y);
		                var dx: number = x - xPlayer;
		                var dy: number = y - yPlayer;
		                var distance: number = Math.floor(Math.sqrt(dx * dx + dy * dy));
		                var newScent: number = this._currentScentValue - distance;
		                if ( newScent > oldScent ) {
		                    this.tiles[x][y].scentAmount = newScent;
		                }
		            }
		        }
		    }
		}
	}
}
