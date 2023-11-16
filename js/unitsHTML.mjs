const unitsHTML = {
  infantryUnitPlayerOne:
  `
  <div class="unit-container -infantry -one _flex" data-player="1" data-capture_capacity="1" data-name="infantry" data-attack_damage="40" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="30" data-movement_range="5" data-residual_move_capacity="5" data-health="100" data-type="infantry" data-sound_delay="500">
    <div class="stats-container -unit _flex -column -gap -half _text -s -bold -center">
    <span class="stat -player -one _flex -aligncenter _color -white">1</span>
    <span class="stat -health _flex -aligncenter _color -white">100</span>
    <span class="stat -attackcapacity _flex -aligncenter _color -white">2</span>
    <span class="stat -movementrange _flex -aligncenter _color -white">5</span>
      <div class="substats-container _flex  -column -gap -half">
      <span class="stat -attackdamage _flex -aligncenter _color -white">40</span>
      <span class="stat -attackrange _flex -aligncenter _color -white">1</span>
      <span class="stat -defense _flex -aligncenter _color -white">30</span>
      </div>
    </div>
  </div>
  `,
  infantryUnitPlayerTwo:
  `
  <div class="unit-container -infantry -two _flex" data-capture_capacity="1" data-player="2" data-name="infantry" data-attack_damage="40" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="30" data-movement_range="5" data-residual_move_capacity="5" data-health="100" data-type="infantry" data-sound_delay="500">
    <div class="stats-container -unit _flex -column -gap -half _text -s -bold -center">
    <span class="stat -player -two _flex -aligncenter _color -white">2</span>
    <span class="stat -health _flex -aligncenter _color -white">100</span>
    <span class="stat -attackcapacity _flex -aligncenter _color -white">2</span>
    <span class="stat -movementrange _flex -aligncenter _color -white">5</span>
      <div class="substats-container _flex  -column -gap -half">
      <span class="stat -attackdamage _flex -aligncenter _color -white">40</span>
      <span class="stat -attackrange _flex -aligncenter _color -white">1</span>
      <span class="stat -defense _flex -aligncenter _color -white">30</span>
      </div>
    </div>
  </div>
  `,
  jeepUnitPlayerOne:
  `
  <div class="unit-container -jeep -one _flex" data-player="1" data-name="jeep" data-attack_damage="50" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="50" data-movement_range="8" data-residual_move_capacity="8" data-health="100" data-type="jeep data-cost="600" data-sound_delay="500">
    <div class="stats-container -unit _flex -column -gap -half _text -s -bold -center">
    <span class="stat -player -one _flex -aligncenter _color -white">1</span>
    <span class="stat -health _flex -aligncenter _color -white">100</span>
    <span class="stat -attackcapacity _flex -aligncenter _color -white">2</span>
    <span class="stat -movementrange _flex -aligncenter _color -white">8</span>
      <div class="substats-container _flex  -column -gap -half">
      <span class="stat -attackdamage _flex -aligncenter _color -white">50</span>
      <span class="stat -attackrange _flex -aligncenter _color -white">1</span>
      <span class="stat -defense _flex -aligncenter _color -white">50</span>
      </div>
    </div>
  </div>
  `,
  jeepUnitPlayerTwo:
  `
  <div class="unit-container -jeep -two _flex" data-player="2" data-name="jeep" data-attack_damage="50" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="50" data-movement_range="8" data-residual_move_capacity="8" data-health="100" data-type="jeep" data-cost="600" data-sound_delay="500">
    <div class="stats-container -unit _flex -column -gap -half _text -s -bold -center">
    <span class="stat -player -two _flex -aligncenter _color -white">2</span>
    <span class="stat -health _flex -aligncenter _color -white">100</span>
    <span class="stat -attackcapacity _flex -aligncenter _color -white">2</span>
    <span class="stat -movementrange _flex -aligncenter _color -white">8</span>
      <div class="substats-container _flex  -column -gap -half">
      <span class="stat -attackdamage _flex -aligncenter _color -white">50</span>
      <span class="stat -attackrange _flex -aligncenter _color -white">1</span>
      <span class="stat -defense _flex -aligncenter _color -white">50</span>
      </div>
    </div>
  </div>
  `,
  artilleryPlayerOne:
  `
  <div class="unit-container -infantry -one -artillery _flex" data-player="1" data-name="artillery" data-attack_damage="90" data-attack_range="3" data-exclusion_attack_range="1" data-attack_capacity="1" data-residual_attack_capacity="1" data-defense="0" data-movement_range="2" data-residual_move_capacity="2" data-health="100" data-type="artillery"data-cost="800" data-sound_delay="5000">
    <div class="stats-container -unit _flex -column -gap -half _text -s -bold -center">
    <span class="stat -player -one _flex -aligncenter _color -white">1</span>
    <span class="stat -health _flex -aligncenter _color -white">100</span>
    <span class="stat -attackcapacity _flex -aligncenter _color -white">1</span>
    <span class="stat -movementrange _flex -aligncenter _color -white">2</span>
      <div class="substats-container _flex  -column -gap -half">
      <span class="stat -attackdamage _flex -aligncenter _color -white">90</span>
      <span class="stat -attackrange _flex -aligncenter _color -white">3</span>
      <span class="stat -defense _flex -aligncenter _color -white">0</span>
      </div>
    </div>
  </div>
  `,
  artilleryPlayerTwo:
  `
  <div class="unit-container -infantry -two -artillery _flex" data-player="2" data-name="artillery" data-attack_damage="90" data-attack_range="3" data-exclusion_attack_range="1" data-attack_capacity="1" data-residual_attack_capacity="1" data-defense="0" data-movement_range="2" data-residual_move_capacity="2" data-health="100" data-type="artillery" data-cost="800" data-sound_delay="5000">
    <div class="stats-container -unit _flex -column -gap -half _text -s -bold -center">
    <span class="stat -player -two _flex -aligncenter _color -white">2</span>
    <span class="stat -health _flex -aligncenter _color -white">100</span>
    <span class="stat -attackcapacity _flex -aligncenter _color -white">1</span>
    <span class="stat -movementrange _flex -aligncenter _color -white">2</span>
      <div class="substats-container _flex  -column -gap -half">
      <span class="stat -attackdamage _flex -aligncenter _color -white">90</span>
      <span class="stat -attackrange _flex -aligncenter _color -white">3</span>
      <span class="stat -defense _flex -aligncenter _color -white">0</span>
      </div>
    </div>
  </div>
  `
}

export default unitsHTML
