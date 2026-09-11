// Unit templates used by the factory.
const unitsHTML = {
  infantryUnitPlayerOne: `
  <div class="unit-container -infantry -one _flex" data-player="1" data-capture_capacity="1" data-name="infantry" data-attack_damage="40" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="10" data-movement_range="5" data-residual_move_capacity="5" data-health="100" data-max_health="100" data-type="infantry" data-cost="200"  data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>  
  `,
  infantryUnitPlayerTwo: `
  <div class="unit-container -infantry -two _flex" data-capture_capacity="1" data-player="2" data-name="infantry" data-attack_damage="40" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="10" data-movement_range="5" data-residual_move_capacity="5" data-health="100" data-max_health="100" data-type="infantry" data-cost="200"  data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>  
  `,
  jeepUnitPlayerOne: `
  <div class="unit-container -jeep -one _flex" data-player="1" data-name="jeep" data-attack_damage="50" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="20" data-movement_range="8" data-residual_move_capacity="8" data-health="125" data-max_health="125" data-type="jeep" data-cost="600" data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>
  `,
  jeepUnitPlayerTwo: `
  <div class="unit-container -jeep -two _flex" data-player="2" data-name="jeep" data-attack_damage="50" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="20" data-movement_range="8" data-residual_move_capacity="8" data-health="125" data-max_health="125" data-type="jeep" data-cost="600" data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>  
  `,
  artilleryPlayerOne: `
  <div class="unit-container -artillery -one _flex" data-player="1" data-name="artillery" data-attack_damage="60" data-attack_range="3" data-exclusion_attack_range="1" data-attack_capacity="1" data-residual_attack_capacity="1" data-defense="25" data-movement_range="3" data-residual_move_capacity="3" data-health="120" data-max_health="120" data-type="artillery" data-cost="1200" data-sound_delay="2000">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>
  `,
  artilleryPlayerTwo: `
  <div class="unit-container -artillery -two _flex" data-player="2" data-name="artillery" data-attack_damage="60" data-attack_range="3" data-exclusion_attack_range="1" data-attack_capacity="1" data-residual_attack_capacity="1" data-defense="25" data-movement_range="3" data-residual_move_capacity="3" data-health="120" data-max_health="120" data-type="artillery" data-cost="1200" data-sound_delay="2000">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>
  `,
  tankPlayerOne: `
  <div class="unit-container -tank -one _flex" data-player="1" data-name="tank" data-attack_damage="70" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="40" data-movement_range="5" data-residual_move_capacity="5" data-health="180" data-max_health="180" data-type="tank" data-cost="1200" data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>
  `,
  tankPlayerTwo: `
  <div class="unit-container -tank -two _flex" data-player="2" data-name="tank" data-attack_damage="70" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="40" data-movement_range="5" data-residual_move_capacity="5" data-health="180" data-max_health="180" data-type="tank" data-cost="1200" data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>
  `
}
