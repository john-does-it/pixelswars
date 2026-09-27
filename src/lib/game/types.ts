export type Player = 1 | 2
export type AiDifficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type Owner = 0 | Player
export type UnitDomain = 'ground' | 'air' | 'naval'
export type KeyboardLayout = 'azerty' | 'qwerty'
export type UnitTypeId = 'infantry' | 'infantry-rocket' | 'infantry-sniper' | 'jeep' | 'artillery' | 'tank' | 'anti-air' | 'helicopter' | 'plane'
export type TerrainId = 'grass' | 'moutain' | 'water' | 'building' | 'road' | 'forest'
export type BuildingId = 'city' | 'factory' | 'hospital' | 'airport'
export type ProductionBuildingId = 'factory' | 'airport'

export interface UnitDefinition {
	name: string
	domain?: UnitDomain
	production?: ProductionBuildingId
	attack: number
	range: number
	exclusion: number
	attacks: number
	defense: number
	movement: number
	maxHealth: number
	cost: number
	captures: boolean
	delay: number
	selectSound: string
	fightSound: string
}

export interface TerrainDefinition {
	name: string
	cost: number
	defense: number
}

export interface MapCell {
	classes: string[]
	owner: Owner
	capturePoints: number
}

export interface MapUnit {
	type: UnitTypeId
	player: Player
	cell: number
}

export interface GameMap {
	id: string
	name: string
	cols: number
	rows: number
	cells: MapCell[]
	units: MapUnit[]
}

export interface Cell extends MapCell, TerrainDefinition {
	index: number
	terrain: TerrainId
	building: BuildingId | null
}

export interface Unit {
	id: number
	type: UnitTypeId
	player: Player
	cell: number
	health: number
	movement: number
	attacks: number
	capture: number
}

export interface MoveOrigin {
	cell: number
	movement: number
}

export interface GameState {
	mapId: string
	cols: number
	rows: number
	cells: Cell[]
	units: Unit[]
	nextId: number
	player: Player
	round: number
	money: Record<Player, number>
	selectedId: number | null
	inspectedEnemyId: number | null
	origin: MoveOrigin | null
	productionIndex: number | null
	hoveredIndex: number | null
	fighting: boolean
	combatTargetIndex: number | null
	winner: Player | null
	explosion: number | null
	incomeCells: number[]
	healedCells: Record<number, number>
	capturedCells: number[]
	securedCells: number[]
	music: boolean
	sound: boolean
	keyboardLayout: KeyboardLayout
	aiThinking: boolean
}

export interface PurchaseStatus {
	missing: number
	occupied: boolean
	available: boolean
}

export interface ControllerOptions {
	aiDifficulty?: AiDifficulty | null
	sound?: (name: string) => void
	delay?: (milliseconds: number) => Promise<void>
}

export interface GameController {
	state: GameState
	start?(): void
	dispose(): void
	fight(defender: Unit): Promise<void>
	select(id: number): void
	clickCell(index: number): void
	move(index: number): void
	cancel(): void
	openProduction(index: number): void
	confirm(): void
	capture(): void
	buy(type: UnitTypeId): void
	endTurn(): void
	keydown(event: KeyboardEvent): void
}

export interface AudioController {
	sound(name: string): void
	music(enabled: boolean, player: Player): void
	dispose(): void
}

export interface StatItem {
	icon?: string | null
	label: string
	value: string | number
	testId?: string
}
