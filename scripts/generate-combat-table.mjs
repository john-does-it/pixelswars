import { mkdirSync, writeFileSync } from 'node:fs'
import rules from '../src/lib/game/combat-rules.ts'
import { createUnit, unitTypes } from '../src/lib/game/catalog.ts'
import { initialState, canAttack, canRetaliate, applyDamage } from '../src/lib/game/model.ts'

const names = { infantry: 'Infanterie', 'infantry-rocket': 'Lance-roquettes', 'infantry-sniper': 'Sniper', jeep: 'Jeep', transport: 'Jeep transport', tank: 'Char', artillery: 'Artillerie', 'anti-air': 'Anti-air', helicopter: 'Hélicoptère', 'transport-helicopter': 'Hélico transport', plane: 'Avion' }
const units = Object.entries(names).map(([id, name]) => ({ id, name, ...unitTypes[id], name }))
const records = []
for (const a of units)
	for (const b of units)
		for (const ah of [100, 50, 25])
			for (const bh of [100, 50, 25])
				for (const distance of [1, 2, 3, 4]) {
					const state = initialState({ id: 'comparison', name: 'Comparison', cols: 5, rows: 1, cells: Array.from({ length: 5 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })), units: [] })
					const attacker = createUnit(a.id, 1, 0, 0)
					const defender = createUnit(b.id, 2, distance, 1)
					attacker.health = Math.round((a.maxHealth * ah) / 100)
					defender.health = Math.round((b.maxHealth * bh) / 100)
					state.units = [attacker, defender]
					const beforeA = attacker.health,
						beforeB = defender.health
					const legal = attacker.attacks > 0 && canAttack(state, attacker, defender)
					let reason = 'Attaque impossible (cible, portée ou unité non armée)'
					if (legal) {
						applyDamage(state, attacker, defender)
						if (canRetaliate(state, defender, attacker)) {
							applyDamage(state, defender, attacker)
							defender.attacks--
							reason = 'Riposte après le premier tir'
						} else reason = defender.health === 0 ? 'Défenseur détruit : aucune riposte' : 'Pas de riposte : cible incompatible, hors portée ou unité non armée'
					}
					records.push({ a: a.id, b: b.id, ah, bh, distance, legal, dealt: beforeB - defender.health, returned: beforeA - attacker.health, beforeA, beforeB, afterA: attacker.health, afterB: defender.health, reason })
				}
const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pixel’s War — PV restants après combat</title>
<style>
body{margin:0;background:#101b19;color:#edf2eb;font:15px/1.5 system-ui,sans-serif}main{max-width:1550px;margin:auto;padding:32px}h1{margin:0;font-size:30px}p{max-width:1100px;color:#bccbc5}.controls{display:flex;gap:24px;flex-wrap:wrap;padding:20px 0}label{display:grid;gap:6px}select{font:inherit;background:#263c34;color:white;padding:9px;border:1px solid #6b8779;border-radius:6px}.scroll{overflow:auto;border:1px solid #43594e;border-radius:8px;margin:16px 0 30px}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{padding:12px 10px;border:1px solid #354b41;text-align:center;min-width:78px}th{background:#21352d}tbody th{text-align:left;position:sticky;left:0;min-width:140px}thead th{font-size:13px}.result{padding:0;min-width:128px}.hp-part{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;text-align:left}.hp-part + .hp-part{border-top:1px solid #43594e}.hp-part small{font-size:11px}.hp-part strong{white-space:nowrap;font-size:16px}.attacker-hp{background:#172f2b;color:#80d8b4}.defender-hp{background:#322827;color:#ffa99c}.impossible{display:block;padding:12px;font-size:12px;color:#a5b9ae}.muted{color:#81958b}.kill{background:#35472b}small{display:block;color:#a5b9ae;font-weight:normal}h2{font-size:20px}#detail{min-height:48px;padding:16px;background:#21352d;border-radius:8px}button{background:none;border:0;color:inherit;font:inherit;cursor:pointer;padding:0;width:100%}button:focus-visible{outline:2px solid #e6cc77}
</style><main><h1>PV restants après combat</h1><p>Un seul tir, suivi de la riposte éventuelle. Chaque case affiche les <b>PV restants des deux unités après l’échange complet</b>. 0 PV signifie que l’unité est détruite. Unités avec toutes leurs munitions au début de cet échange. Terrain neutre (défense 0 %), sans bonus de portée. La riposte utilise la santé restante du défenseur et consomme une munition ; sans munition, aucune riposte.</p>
<div class="controls"><label>PV initiaux de l’attaquant<select id="ah"><option value="100">Max — 100 %</option><option value="50">Mi-vie — 50 %</option><option value="25">Faible — 25 %</option></select></label><label>PV initiaux de l’attaqué<select id="bh"><option value="100">Max — 100 %</option><option value="50">Mi-vie — 50 %</option><option value="25">Faible — 25 %</option></select></label><label>Distance<select id="distance"><option value="auto">Minimum légal de chaque attaquant</option><option value="1">1 case</option><option value="2">2 cases</option><option value="3">3 cases</option><option value="4">4 cases</option></select></label></div>
<p>Lignes : attaquant · Colonnes : attaqué. Dans chaque case : <b>attaquant en haut, attaqué en bas</b>. Les nombres indiquent les PV restants, pas les dégâts. Une attaque impossible est signalée explicitement. Cliquez pour voir les PV avant et après.</p><div class="scroll"><table id="matrix"></table></div><div id="detail" aria-live="polite">Sélectionnez une case du tableau.</div>
<h2>Les trois états de santé, côte à côte</h2><label>Unité attaquante<select id="focus"></select></label><p>Le défenseur et la distance suivent les réglages ci-dessus. Chaque colonne fait varier uniquement la santé de l’attaquant.</p><div class="scroll"><table id="compare"></table></div>
<h2>Protection cumulée selon le terrain</h2><p>Réduction totale avant les coefficients du duel. Les aéronefs ne bénéficient pas de la protection du terrain. Le maximum actuel est de 56,25 % : char sur montagne. Cela laisse passer 43,75 % des dégâts, et ne rend aucune unité invulnérable. À très faibles PV, l’arrondi peut toutefois annuler un petit coup.</p><div class="scroll"><table><thead><tr><th>Unité</th><th>Terrain neutre</th><th>Forêt</th><th>Bâtiment</th><th>Montagne</th></tr></thead><tbody>${units.map((u) => '<tr><th>' + u.name + '</th>' + [0, 30, 40, 50].map((cover) => '<td>' + (100 - rules.damage(100, 100, 100, u.defense, u.domain === 'air' ? 0 : cover, 'probe', 'probe')).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %</td>').join('') + '</tr>').join('')}</tbody></table></div><h2>Statistiques de référence</h2><div class="scroll"><table><thead><tr><th>Unité</th><th>Coût</th><th>PV max</th><th>PV à 50 %</th><th>PV à 25 %</th><th>Attaque</th><th>Défense (points)</th><th>Portée</th><th>Tirs / tour</th></tr></thead><tbody>${units.map((u) => `<tr><th>${u.name}</th><td>${u.cost}</td><td>${u.maxHealth}</td><td>${Math.round(u.maxHealth * 0.5)}</td><td>${Math.round(u.maxHealth * 0.25)}</td><td>${u.attack}</td><td>${u.defense}</td><td>${u.attacks ? u.exclusion + 1 + '–' + u.range : '—'}</td><td>${u.attacks}</td></tr>`).join('')}</tbody></table></div>
<p>Formule : attaque × (1 − 0,75 × défense / 100) × (1 − 0,75 × défense du terrain / 100) × ratio de PV × coefficient du duel. Chaque point de défense donne 0,75 % de réduction avant cumul. Le moteur arrondit les PV restants après chaque coup. Les PV initiaux à 50 % et 25 % sont arrondis à l’entier le plus proche. Distances carrées, diagonales incluses. Les unités à deux tirs ne tirent qu’une fois par échange présenté ici.</p><p>Calculé directement avec catalog.ts et model.ts. Régénération : node --experimental-strip-types scripts/generate-combat-table.mjs. Ce document ne modifie pas l’équilibrage du jeu.</p></main>
<script>
const units=${JSON.stringify(units)}, records=${JSON.stringify(records)};
const $=id=>document.getElementById(id);
$('focus').innerHTML=units.map(u=>'<option value="'+u.id+'">'+u.name+'</option>').join('');
function record(a,b,h){const d=$('distance').value==='auto'?a.exclusion+1:Number($('distance').value);return records.find(r=>r.a===a.id&&r.b===b.id&&r.ah===h&&r.bh===Number($('bh').value)&&r.distance===d)}
function cell(r){return '<td class="result"><button data-index="'+records.indexOf(r)+'">'+(r.legal?'<span class="hp-part attacker-hp"><small>Attaquant<br>PV restants</small><strong>'+r.afterA+' PV</strong></span><span class="hp-part defender-hp"><small>Attaqué<br>PV restants</small><strong>'+r.afterB+' PV</strong></span>':'<span class="impossible">Attaque<br>impossible</span>')+'</button></td>'}
function render(){ $('matrix').innerHTML='<thead><tr><th>Attaquant ↓ / Attaqué →</th>'+units.map(u=>'<th>'+u.name+'</th>').join('')+'</tr></thead><tbody>'+units.map(a=>'<tr><th>'+a.name+'<small>'+Math.round(a.maxHealth*Number($('ah').value)/100)+' PV · distance '+($('distance').value==='auto'?a.exclusion+1:$('distance').value)+'</small></th>'+units.map(b=>cell(record(a,b,Number($('ah').value)))).join('')+'</tr>').join('')+'</tbody>'; const a=units.find(u=>u.id===$('focus').value);$('compare').innerHTML='<thead><tr><th>Attaqué</th><th>Max (100 %)</th><th>Mi-vie (50 %)</th><th>Faible (25 %)</th></tr></thead><tbody>'+units.map(b=>'<tr><th>'+b.name+'</th>'+[100,50,25].map(h=>cell(record(a,b,h))).join('')+'</tr>').join('')+'</tbody>';$('detail').textContent='Sélectionnez une case du tableau.';}
document.addEventListener('change',render);document.addEventListener('click',e=>{const button=e.target.closest('[data-index]');if(!button)return;const r=records[button.dataset.index];$('detail').textContent=units.find(u=>u.id===r.a).name+' → '+units.find(u=>u.id===r.b).name+' · Distance '+r.distance+' · Attaquant : '+r.beforeA+' → '+r.afterA+' PV · Attaqué : '+r.beforeB+' → '+r.afterB+' PV. '+r.reason;});render();
</script></html>`
mkdirSync(new URL('../docs/balance/', import.meta.url), { recursive: true })
writeFileSync(new URL('../docs/balance/combat.html', import.meta.url), html)
console.log(`Generated ${records.length} exchanges for ${units.length} units.`)
