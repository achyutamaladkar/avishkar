export type SetupId =
  | 'naked-eye'
  | 'binoculars'
  | 'refractor'
  | 'newtonian-dobsonian'
  | 'mak-sct'
  | 'goto-tracking';

export interface ObservingSetup {
  id: SetupId;
  title: string;
  shortLabel: string;
  suitabilityBadge: string;
  suitabilityTone: 'recommended' | 'good' | 'challenging' | 'advanced';
  skillLevel: string;
  costTier: string;
  overview: string;
  issSuitability: string;
  components: {
    optics: string;
    mount: string;
    tripod: string;
    finder: string;
    eyepiece: string;
    adapter: string;
  };
  setupSteps: string[];
  beforePassSteps: string[];
  commonMistakes: Array<{ mistake: string; fix: string }>;
  limitations: string;
}

export const OBSERVING_SETUPS: ObservingSetup[] = [
  {
    id: 'naked-eye',
    title: 'Naked-Eye Observing',
    shortLabel: 'Naked Eye (No Telescope)',
    suitabilityBadge: 'Best for Beginners & ISS',
    suitabilityTone: 'recommended',
    skillLevel: 'Complete beginner',
    costTier: 'Free (no equipment needed)',
    overview:
      'Simply watching the sky with your own eyes. You get the widest possible view of the night sky, making it effortless to spot bright, fast-moving satellites.',
    issSuitability:
      'Best choice for the ISS. The station is bright enough to look like a steady, fast-moving star gliding smoothly across the sky—no telescope required.',
    components: {
      optics: 'Your own eyes (let them adjust to darkness for 5–10 minutes).',
      mount: 'None needed.',
      tripod: 'Optional reclining lawn chair or blanket to avoid neck strain.',
      finder: 'Use OrbitView’s Sky-Track Radar and Find in Sky compass.',
      eyepiece: 'None needed — natural wide field of view.',
      adapter: 'Optional smartphone on a small tripod for long-exposure streak photos.',
    },
    setupSteps: [
      'Choose an open spot away from bright streetlights, tall buildings, and trees.',
      'Turn your phone screen brightness down so your eyes stay adapted to the dark.',
      'Check OrbitView’s Sky-Track Radar to see where the pass starts, peaks, and ends.',
    ],
    beforePassSteps: [
      'Step outside 5 minutes before the predicted start time so your eyes adjust.',
      'Face the predicted starting compass direction and scan above the horizon.',
      'Look for a steady, non-blinking bright point moving smoothly (airplanes blink; the ISS does not).',
    ],
    commonMistakes: [
      {
        mistake: 'Confusing a blinking airplane for the ISS.',
        fix: 'Airplanes flash red/white navigation lights; the ISS shines with a steady white/warm glow.',
      },
      {
        mistake: 'Looking at your bright phone screen right before the pass.',
        fix: 'Memorize the start direction from the Sky-Track Radar first, then look up.',
      },
    ],
    limitations:
      'Shows the ISS as a bright moving point of light rather than structural details. Clouds or heavy light pollution can hide fainter satellites.',
  },
  {
    id: 'binoculars',
    title: 'Binoculars',
    shortLabel: 'Binoculars',
    suitabilityBadge: 'Great Wide-Field Upgrade',
    suitabilityTone: 'good',
    skillLevel: 'Beginner',
    costTier: 'Low to moderate',
    overview:
      'Two small side-by-side refracting telescopes (such as 7×50 or 10×50) that gather more light than your eyes while keeping a wide, comfortable field of view.',
    issSuitability:
      'Useful for fainter satellites and for making the ISS look noticeably brighter, while still keeping a wide enough view to pan along by hand.',
    components: {
      optics: 'Pair of binocular barrels (e.g., 7×50 or 10×50) with objective lenses.',
      mount: 'Usually handheld; optional L-bracket binocular adapter for steadier views.',
      tripod: 'Optional standard photo tripod if using 10×50 or larger binoculars.',
      finder: 'None needed — spot the satellite with your eyes first, then raise binoculars.',
      eyepiece: 'Built-in paired eyepieces with a center focus wheel and right-eye diopter.',
      adapter: 'Optional universal smartphone digiscoping clamp over one eyepiece.',
    },
    setupSteps: [
      'Adjust the hinge width (interpupillary distance) until both circles merge into one.',
      'Focus on a bright star or distant streetlight using the center focus wheel.',
      'Fine-tune the right-eye diopter ring so both eyes see a sharp point.',
      'Brace your elbows against your chest or lean on a car/fence to steady your hands.',
    ],
    beforePassSteps: [
      'Spot the ISS with your naked eyes first — do not search blind through binoculars.',
      'Once you see it moving, keep your eyes locked on it and raise the binoculars to your eyes.',
      'Pan smoothly along its path toward the predicted peak direction.',
    ],
    commonMistakes: [
      {
        mistake: 'Trying to hunt for the satellite while already looking through the binoculars.',
        fix: 'Always acquire the ISS naked-eye first, then bring the binoculars up to your line of sight.',
      },
      {
        mistake: 'Choosing very high-magnification binoculars (like 20×80) handheld.',
        fix: 'High magnification shakes heavily and narrows the view; 7× or 10× is much easier for satellites.',
      },
    ],
    limitations:
      'Still shows the ISS as a bright point of light without fine structural detail. Higher-power binoculars get heavy quickly without a tripod.',
  },
  {
    id: 'refractor',
    title: 'Refractor Telescope',
    shortLabel: 'Refractor Telescope',
    suitabilityBadge: 'Manual Tracking Practice',
    suitabilityTone: 'challenging',
    skillLevel: 'Beginner to intermediate',
    costTier: 'Moderate',
    overview:
      'A classic lens-based telescope with an enclosed tube. Low-maintenance and intuitive to point, great for the Moon, planets, and wide star fields.',
    issSuitability:
      'Challenging for the ISS because the station crosses the sky rapidly. Use your widest, lowest-magnification eyepiece and practice smooth manual panning.',
    components: {
      optics: 'Enclosed optical tube with a front glass objective lens and dew shield.',
      mount: 'Alt-azimuth (up/down, left/right) mount — easiest for manual satellite panning.',
      tripod: 'Three-legged tripod with an accessory tray for eyepieces.',
      finder: 'Red-dot finder or small 6×30 finder scope mounted on top of the tube.',
      eyepiece: 'Star diagonal plus a low-power, wide-field eyepiece (e.g., 25mm–32mm).',
      adapter: 'Optional smartphone eyepiece clamp for Moon/planet shots.',
    },
    setupSteps: [
      'Spread the tripod legs firmly on level ground and attach the mount head.',
      'Clamp the optical tube onto the mount and balance it so it does not tip.',
      'Insert the star diagonal and your lowest-magnification eyepiece (largest mm number, e.g., 25mm).',
      'During daylight (away from the Sun!), align the red-dot finder with a distant rooftop or treetop.',
    ],
    beforePassSteps: [
      'Leave the alt-azimuth clutches slightly loose so you can glide smoothly by hand.',
      'Aim near the predicted peak path ahead of time, or track using the aligned red-dot finder.',
      'Keep magnification low — high power makes the fast-moving ISS shoot out of view in under a second.',
    ],
    commonMistakes: [
      {
        mistake: 'Using a 10mm or 4mm high-power eyepiece or Barlow lens.',
        fix: 'Start with your widest eyepiece (25mm–32mm) to maximize the chance of keeping the ISS in view.',
      },
      {
        mistake: 'Forgetting to align the finder scope beforehand.',
        fix: 'Align the finder on a distant landmark or bright star before the pass starts.',
      },
    ],
    limitations:
      'Through an ordinary beginner refractor, tracking the ISS manually is difficult and requires practice; most beginners still prefer naked-eye viewing for the pass itself.',
  },
  {
    id: 'newtonian-dobsonian',
    title: 'Newtonian Reflector or Dobsonian',
    shortLabel: 'Newtonian / Dobsonian',
    suitabilityBadge: 'Manual Tracking Practice',
    suitabilityTone: 'challenging',
    skillLevel: 'Beginner to intermediate',
    costTier: 'Moderate',
    overview:
      'A mirror-based telescope that gathers lots of light for the cost. On a Dobsonian rocker-box base, it sits on the ground and nudges smoothly in any direction.',
    issSuitability:
      'Possible to pan manually with practice using a Dobsonian base and a wide-field eyepiece, though keeping the fast-moving ISS centered takes skill.',
    components: {
      optics: 'Open-front tube with a primary mirror at the bottom and a small secondary mirror at the top.',
      mount: 'Dobsonian lazy-Susan rocker box (ideal for smooth nudging) or equatorial mount.',
      tripod: 'Dobsonians sit on a ground base; tripod-mounted Newtonians use a heavy tripod.',
      finder: 'Zero-power red-dot / Telrad finder (best for sweeping across the sky) or finder scope.',
      eyepiece: 'Side-mounted focuser at the top of the tube with a wide-field 25mm–32mm eyepiece.',
      adapter: 'Optional phone adapter clamped to the eyepiece.',
    },
    setupSteps: [
      'Place the Dobsonian base on flat ground (or level a tripod-mounted Newtonian).',
      'Set the optical tube into the base cradle and attach the tension springs/handles.',
      'Insert your widest eyepiece (25mm–32mm) into the side focuser and focus on a bright star.',
      'Verify your red-dot finder is aligned with the main eyepiece view.',
    ],
    beforePassSteps: [
      'Practice moving the tube smoothly from the predicted start direction toward peak elevation.',
      'Use both eyes open with a red-dot finder to keep the dot ahead of the moving ISS.',
      'If using an equatorial mount, note that panning diagonally across the sky is awkward compared to alt-az.',
    ],
    commonMistakes: [
      {
        mistake: 'Trying to track a satellite on a locked equatorial mount.',
        fix: 'Alt-azimuth or Dobsonian motion (up/down, left/right) is far more natural for satellite passes.',
      },
      {
        mistake: 'Using high magnification or an uncooled mirror.',
        fix: 'Set the scope outside 20 minutes early and stick to wide-field low power.',
      },
    ],
    limitations:
      'Fast manual nudging takes practice, and you should not expect crisp ISS solar-panel views as a beginner. Mirrors also need occasional alignment (collimation).',
  },
  {
    id: 'mak-sct',
    title: 'Maksutov or Schmidt-Cassegrain (SCT)',
    shortLabel: 'Maksutov / SCT',
    suitabilityBadge: 'Narrow View — Hard for ISS',
    suitabilityTone: 'challenging',
    skillLevel: 'Intermediate',
    costTier: 'Moderate to high',
    overview:
      'Compact, folded-optics telescopes with long focal lengths. They excel at high-magnification views of the Moon, Saturn, and Jupiter from small balconies.',
    issSuitability:
      'Difficult for the ISS because their long focal length gives a narrow field of view, making it very hard to catch or follow a fast-moving satellite.',
    components: {
      optics: 'Short, wide optical tube with a front corrector lens and internal mirrors.',
      mount: 'Single-arm fork mount, alt-az mount, or equatorial mount.',
      tripod: 'Sturdy steel or aluminum tripod.',
      finder: 'Red-dot finder or 8×50 right-angle finder.',
      eyepiece: 'Rear visual back, star diagonal, and a long focal-length eyepiece (32mm–40mm).',
      adapter: 'Optional focal reducer (helps widen the view) and camera/phone adapter.',
    },
    setupSteps: [
      'Set the telescope outside 30–45 minutes before observing so the closed tube reaches outdoor temperature.',
      'Attach the diagonal and your widest eyepiece (32mm or 40mm) to get the widest possible view.',
      'Align the finder carefully with the center of the main eyepiece view.',
    ],
    beforePassSteps: [
      'Pre-aim at a bright star near the ISS’s predicted peak path rather than chasing it from the horizon.',
      'Keep expectations realistic: watch the pass naked-eye first if you do not want to miss it.',
    ],
    commonMistakes: [
      {
        mistake: 'Assuming a big, expensive Maksutov/SCT makes spotting the ISS easier.',
        fix: 'Long focal length narrows your sky window. Naked-eye or binoculars are much easier for the ISS.',
      },
      {
        mistake: 'Skipping cool-down time.',
        fix: 'Warm air trapped inside the closed tube blurs stars until it acclimates outdoors.',
      },
    ],
    limitations:
      'Narrow field of view and longer cool-down time make these scopes much better suited to planets and the Moon than fast low-Earth-orbit passes.',
  },
  {
    id: 'goto-tracking',
    title: 'Computerized GoTo & Satellite-Tracking Setup',
    shortLabel: 'GoTo / Satellite Tracking',
    suitabilityBadge: 'Advanced Option',
    suitabilityTone: 'advanced',
    skillLevel: 'Intermediate to advanced',
    costTier: 'High',
    overview:
      'Motorized mounts that point to stars automatically using an alignment routine, plus specialized dual-axis mounts and software designed for fast satellite slewing.',
    issSuitability:
      'Important limitation: a standard consumer GoTo mount tracks stars and planets at sidereal speed—it does NOT automatically track the fast motion of the ISS. Dedicated satellite-tracking software/mounts are an advanced setup.',
    components: {
      optics: 'Short-to-medium focal length telescope or camera lens with a wide field of view.',
      mount: 'Motorized alt-az or equatorial GoTo mount (fast slew rate required for satellite tracking).',
      tripod: 'Heavy, leveled tripod with external battery/power pack.',
      finder: 'Aligned red-dot finder or electronic guide/finder camera.',
      eyepiece: 'Wide-field eyepiece or planetary/astronomy camera for high-frame-rate capture.',
      adapter: 'Laptop/controller cable or Wi-Fi link running specialized satellite-tracking software with fresh TLEs.',
    },
    setupSteps: [
      'Level the tripod and power up the mount with a reliable battery.',
      'Perform a careful 2-star or 3-star alignment with accurate local time, date, and GPS/city coordinates.',
      'If using specialized satellite-tracking software, load fresh CelesTrak orbit data before the pass.',
    ],
    beforePassSteps: [
      'Verify cable slack so the telescope does not snag during fast slews.',
      'Run a dry test slew before the pass begins and confirm the target is above obstructions.',
      'If your GoTo mount only supports standard star/planet tracking, unlock the clutches or use OrbitView naked-eye instead.',
    ],
    commonMistakes: [
      {
        mistake: 'Expecting any standard GoTo telescope to automatically follow the ISS out of the box.',
        fix: 'Most GoTo hand controllers only track at star/planet rates unless paired with specialized satellite-tracking firmware or PC software.',
      },
      {
        mistake: 'Entering the wrong time zone or daylight-saving offset during alignment.',
        fix: 'Double-check your local time and coordinates against OrbitView before aligning.',
      },
    ],
    limitations:
      'Higher cost, steeper learning curve, and relies on fresh orbital elements, accurate leveling, and fast motor slewing. Beginners should enjoy their first ISS passes naked-eye first.',
  },
];

export function getSetupById(id: SetupId): ObservingSetup {
  return OBSERVING_SETUPS.find((s) => s.id === id) ?? OBSERVING_SETUPS[0];
}
