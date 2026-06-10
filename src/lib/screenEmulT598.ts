// AUTO-GENERATED — do not edit by hand.
// Source: FORAI/T598_spec.json + T598_navigation_table.csv
// (VirtualGuide_T598_v09.pdf, 160 OLED screens; edges = PDF internal hyperlinks).
// Regenerate by re-running the FORAI import. Each screen is one OLED state; a
// physical button maps to the destination screen id (missing = no effect).

export type T598BarColor = 'BLUE' | 'RED' | 'GREEN'

export type T598Button =
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'L3'
  | 'R3'
  | 'SET'
  | 'MODE'
  | 'CENTER'
  | 'LPADDLE'
  | 'RPADDLE'

export interface T598Screen {
  /** Page number = state id in the OLED menu state machine. */
  id: number
  /** Exact text shown on the OLED for this state. */
  content: string
  category: string
  color: T598BarColor
  /** Render path under public/agentor (e.g. 'screens/s001.png'). */
  image: string
  /** Physical button -> destination screen id. A missing button has no effect. */
  transitions: Partial<Record<T598Button, number>>
}

export const T598_ENTRY_POINTS = {
  boot: 1,
  home: 4,
  settingsRoot: 22,
  dashboardRoot: 150,
  modeSelect: 7,
} as const

export interface T598Mode {
  id: string
  label: string
  barColor: T598BarColor
  selectScreen: number
  home: number
}

export const T598_MODES: T598Mode[] = [
  { id: 'PS_MODE_1', label: 'PlayStation Mode 1', barColor: 'BLUE', selectScreen: 7, home: 4 },
  { id: 'PS_MODE_2', label: 'PlayStation Mode 2', barColor: 'RED', selectScreen: 8, home: 6 },
  { id: 'PC_MODE', label: 'PC Mode', barColor: 'GREEN', selectScreen: 9, home: 5 },
]

export const T598_SCREENS: T598Screen[] = [
  { id: 1, content: 'BOOT  (logo T598, blue bar)', category: 'BOOT', color: 'BLUE', image: 'screens/s001.png', transitions: { SET: 4, MODE: 7 } },
  { id: 2, content: 'BOOT  (logo T598, red bar)', category: 'BOOT', color: 'RED', image: 'screens/s002.png', transitions: { SET: 5, MODE: 8 } },
  { id: 3, content: 'BOOT  (logo T598)', category: 'BOOT', color: 'GREEN', image: 'screens/s003.png', transitions: { SET: 6, MODE: 9 } },
  { id: 4, content: 'HOME  Gear+Speedo  [PS Mode1]', category: 'HOME', color: 'BLUE', image: 'screens/s004.png', transitions: { L3: 22, R3: 150, SET: 1 } },
  { id: 5, content: 'HOME  Gear+Speedo  [PC]', category: 'HOME', color: 'GREEN', image: 'screens/s005.png', transitions: { L3: 22, R3: 150, SET: 2 } },
  { id: 6, content: 'HOME  Gear+Speedo  [PS Mode2]', category: 'HOME', color: 'RED', image: 'screens/s006.png', transitions: { L3: 22, R3: 150, SET: 3 } },
  { id: 7, content: 'Compatibility: PLAYSTATION MODE 1', category: 'MODE SELECT (Compatibility)', color: 'BLUE', image: 'screens/s007.png', transitions: { UP: 9, DOWN: 8, MODE: 10 } },
  { id: 8, content: 'Compatibility: PLAYSTATION MODE 2', category: 'MODE SELECT (Compatibility)', color: 'RED', image: 'screens/s008.png', transitions: { UP: 7, DOWN: 9, MODE: 11 } },
  { id: 9, content: 'Compatibility: PC MODE', category: 'MODE SELECT (Compatibility)', color: 'GREEN', image: 'screens/s009.png', transitions: { UP: 8, DOWN: 7, MODE: 12 } },
  { id: 10, content: 'Hands off Wheel - REBOOT', category: 'REBOOT', color: 'BLUE', image: 'screens/s010.png', transitions: { CENTER: 1 } },
  { id: 11, content: 'Hands off Wheel - REBOOT', category: 'REBOOT', color: 'RED', image: 'screens/s011.png', transitions: { CENTER: 2 } },
  { id: 12, content: 'Hands off Wheel - REBOOT', category: 'REBOOT', color: 'GREEN', image: 'screens/s012.png', transitions: { CENTER: 3 } },
  { id: 13, content: 'FACTORY RESET ?', category: 'FACTORY RESET', color: 'BLUE', image: 'screens/s013.png', transitions: { DOWN: 14, LEFT: 135, RIGHT: 17, R3: 150, SET: 1 } },
  { id: 14, content: 'RESET ?  NO / YES', category: 'FACTORY RESET', color: 'BLUE', image: 'screens/s014.png', transitions: { LEFT: 13, RIGHT: 15, R3: 150, SET: 1 } },
  { id: 15, content: 'OK (check)', category: 'FACTORY RESET', color: 'BLUE', image: 'screens/s015.png', transitions: { CENTER: 16 } },
  { id: 16, content: 'Hands off Wheel - REBOOT', category: 'REBOOT', color: 'BLUE', image: 'screens/s016.png', transitions: { CENTER: 1 } },
  { id: 17, content: 'Serial Number 5103XXXXX...067', category: 'INFO (Serial/QR)', color: 'BLUE', image: 'screens/s017.png', transitions: { LEFT: 13, RIGHT: 22, R3: 150, SET: 1 } },
  { id: 18, content: 'QR code', category: 'INFO (Serial/QR)', color: 'BLUE', image: 'screens/s018.png', transitions: { R3: 150, SET: 1 } },
  { id: 19, content: 'Brightness +1', category: 'BRIGHTNESS', color: 'BLUE', image: 'screens/s019.png', transitions: { DOWN: 22, LEFT: 20, R3: 150, SET: 1 } },
  { id: 20, content: 'Brightness 0', category: 'BRIGHTNESS', color: 'BLUE', image: 'screens/s020.png', transitions: { DOWN: 22, LEFT: 21, RIGHT: 19, R3: 150, SET: 1 } },
  { id: 21, content: 'Brightness -1', category: 'BRIGHTNESS', color: 'BLUE', image: 'screens/s021.png', transitions: { DOWN: 22, RIGHT: 20, R3: 150, SET: 1 } },
  { id: 22, content: 'FW 3.08  (firmware)', category: 'FIRMWARE', color: 'BLUE', image: 'screens/s022.png', transitions: { UP: 19, DOWN: 23, LEFT: 17, RIGHT: 118, R3: 150, SET: 1 } },
  { id: 23, content: 'FFB profile select  D[1]2 3', category: 'FFB PROFILE SELECT', color: 'BLUE', image: 'screens/s023.png', transitions: { UP: 22, DOWN: 27, LEFT: 26, RIGHT: 24, R3: 150, SET: 1 } },
  { id: 24, content: 'FFB profile select  D 1[2]3', category: 'FFB PROFILE SELECT', color: 'BLUE', image: 'screens/s024.png', transitions: { UP: 22, DOWN: 35, LEFT: 23, RIGHT: 25, R3: 150, SET: 1 } },
  { id: 25, content: 'FFB profile select  D 1 2[3]', category: 'FFB PROFILE SELECT', color: 'BLUE', image: 'screens/s025.png', transitions: { UP: 22, DOWN: 35, LEFT: 24, RIGHT: 26, R3: 150, SET: 1 } },
  { id: 26, content: 'FFB profile select  [D]1 2 3', category: 'FFB PROFILE SELECT', color: 'BLUE', image: 'screens/s026.png', transitions: { UP: 22, DOWN: 35, LEFT: 25, RIGHT: 23, R3: 150, SET: 1 } },
  { id: 27, content: 'FFBD MASTER 50%', category: 'FFBD', color: 'BLUE', image: 'screens/s027.png', transitions: { UP: 23, DOWN: 106, R3: 150, SET: 1 } },
  { id: 28, content: 'FFB1 MASTER 100%', category: 'FFB1', color: 'BLUE', image: 'screens/s028.png', transitions: { UP: 24, DOWN: 44, LEFT: 29, R3: 150, SET: 1 } },
  { id: 29, content: 'FFB1 MASTER 90%', category: 'FFB1', color: 'BLUE', image: 'screens/s029.png', transitions: { UP: 24, DOWN: 44, LEFT: 30, RIGHT: 28, R3: 150, SET: 1 } },
  { id: 30, content: 'FFB1 MASTER 80%', category: 'FFB1', color: 'BLUE', image: 'screens/s030.png', transitions: { UP: 24, DOWN: 44, LEFT: 31, RIGHT: 29, R3: 150, SET: 1 } },
  { id: 31, content: 'FFB1 MASTER 70%', category: 'FFB1', color: 'BLUE', image: 'screens/s031.png', transitions: { UP: 24, DOWN: 44, LEFT: 32, RIGHT: 30, R3: 150, SET: 1 } },
  { id: 32, content: 'FFB1 MASTER 65%', category: 'FFB1', color: 'BLUE', image: 'screens/s032.png', transitions: { UP: 24, DOWN: 44, LEFT: 33, RIGHT: 31, R3: 150, SET: 1 } },
  { id: 33, content: 'FFB1 MASTER 60%', category: 'FFB1', color: 'BLUE', image: 'screens/s033.png', transitions: { UP: 24, DOWN: 44, LEFT: 34, RIGHT: 32, R3: 150, SET: 1 } },
  { id: 34, content: 'FFB1 MASTER 55%', category: 'FFB1', color: 'BLUE', image: 'screens/s034.png', transitions: { UP: 24, DOWN: 44, LEFT: 35, RIGHT: 33, R3: 150, SET: 1 } },
  { id: 35, content: 'FFB1 MASTER 50%', category: 'FFB1', color: 'BLUE', image: 'screens/s035.png', transitions: { UP: 24, DOWN: 44, LEFT: 36, RIGHT: 34, R3: 150, SET: 1 } },
  { id: 36, content: 'FFB1 MASTER 45%', category: 'FFB1', color: 'BLUE', image: 'screens/s036.png', transitions: { UP: 24, DOWN: 44, LEFT: 37, RIGHT: 35, R3: 150, SET: 1 } },
  { id: 37, content: 'FFB1 MASTER 40%', category: 'FFB1', color: 'BLUE', image: 'screens/s037.png', transitions: { UP: 24, DOWN: 44, LEFT: 38, RIGHT: 36, R3: 150, SET: 1 } },
  { id: 38, content: 'FFB1 MASTER 35%', category: 'FFB1', color: 'BLUE', image: 'screens/s038.png', transitions: { UP: 24, DOWN: 44, LEFT: 39, RIGHT: 37, R3: 150, SET: 1 } },
  { id: 39, content: 'FFB1 MASTER 30%', category: 'FFB1', color: 'BLUE', image: 'screens/s039.png', transitions: { UP: 24, DOWN: 44, LEFT: 40, RIGHT: 38, R3: 150, SET: 1 } },
  { id: 40, content: 'FFB1 MASTER 20%', category: 'FFB1', color: 'BLUE', image: 'screens/s040.png', transitions: { UP: 24, DOWN: 44, LEFT: 41, RIGHT: 39, R3: 150, SET: 1 } },
  { id: 41, content: 'FFB1 MASTER 10%', category: 'FFB1', color: 'BLUE', image: 'screens/s041.png', transitions: { UP: 24, DOWN: 44, LEFT: 42, RIGHT: 40, R3: 150, SET: 1 } },
  { id: 42, content: 'FFB1 MASTER 0%', category: 'FFB1', color: 'BLUE', image: 'screens/s042.png', transitions: { UP: 24, DOWN: 44, RIGHT: 41, R3: 150, SET: 1 } },
  { id: 43, content: 'FFB1 MODE B[SPE]', category: 'FFB1', color: 'BLUE', image: 'screens/s043.png', transitions: { UP: 35, DOWN: 48, LEFT: 46, RIGHT: 44, R3: 150, SET: 1 } },
  { id: 44, content: 'FFB1 MODE [B]SPE', category: 'FFB1', color: 'BLUE', image: 'screens/s044.png', transitions: { UP: 35, DOWN: 48, LEFT: 43, RIGHT: 45, R3: 150, SET: 1 } },
  { id: 45, content: 'FFB1 MODE BS[P]E', category: 'FFB1', color: 'BLUE', image: 'screens/s045.png', transitions: { UP: 35, DOWN: 48, LEFT: 44, RIGHT: 46, R3: 150, SET: 1 } },
  { id: 46, content: 'FFB1 MODE BSP[E]', category: 'FFB1', color: 'BLUE', image: 'screens/s046.png', transitions: { UP: 35, DOWN: 48, LEFT: 45, RIGHT: 43, R3: 150, SET: 1 } },
  { id: 47, content: 'FFB1 INERTIA OFF', category: 'FFB1', color: 'BLUE', image: 'screens/s047.png', transitions: { UP: 44, DOWN: 53, LEFT: 50, RIGHT: 48, R3: 150, SET: 1 } },
  { id: 48, content: 'FFB1 INERTIA MID', category: 'FFB1', color: 'BLUE', image: 'screens/s048.png', transitions: { UP: 44, DOWN: 53, LEFT: 47, RIGHT: 49, R3: 150, SET: 1 } },
  { id: 49, content: 'FFB1 INERTIA HIGH', category: 'FFB1', color: 'BLUE', image: 'screens/s049.png', transitions: { UP: 44, DOWN: 53, LEFT: 48, RIGHT: 50, R3: 150, SET: 1 } },
  { id: 50, content: 'FFB1 INERTIA EXT', category: 'FFB1', color: 'BLUE', image: 'screens/s050.png', transitions: { UP: 44, DOWN: 53, LEFT: 49, RIGHT: 47, R3: 150, SET: 1 } },
  { id: 51, content: 'FFB1 FRICTION OFF', category: 'FFB1', color: 'BLUE', image: 'screens/s051.png', transitions: { UP: 48, DOWN: 57, LEFT: 54, RIGHT: 52, R3: 150, SET: 1 } },
  { id: 52, content: 'FFB1 FRICTION LOW', category: 'FFB1', color: 'BLUE', image: 'screens/s052.png', transitions: { UP: 48, DOWN: 57, LEFT: 51, RIGHT: 53, R3: 150, SET: 1 } },
  { id: 53, content: 'FFB1 FRICTION MID', category: 'FFB1', color: 'BLUE', image: 'screens/s053.png', transitions: { UP: 48, DOWN: 57, LEFT: 52, RIGHT: 54, R3: 150, SET: 1 } },
  { id: 54, content: 'FFB1 FRICTION HIGH', category: 'FFB1', color: 'BLUE', image: 'screens/s054.png', transitions: { UP: 48, DOWN: 57, LEFT: 53, RIGHT: 51, R3: 150, SET: 1 } },
  { id: 55, content: 'FFB1 BOOST LOW -2', category: 'FFB1', color: 'BLUE', image: 'screens/s055.png', transitions: { UP: 53, DOWN: 63, LEFT: 59, RIGHT: 56, R3: 150, SET: 1 } },
  { id: 56, content: 'FFB1 BOOST LOW -1', category: 'FFB1', color: 'BLUE', image: 'screens/s056.png', transitions: { UP: 53, DOWN: 63, LEFT: 55, RIGHT: 57, R3: 150, SET: 1 } },
  { id: 57, content: 'FFB1 BOOST LOW 0', category: 'FFB1', color: 'BLUE', image: 'screens/s057.png', transitions: { UP: 53, DOWN: 63, LEFT: 56, RIGHT: 58, R3: 150, SET: 1 } },
  { id: 58, content: 'FFB1 BOOST LOW +1', category: 'FFB1', color: 'BLUE', image: 'screens/s058.png', transitions: { UP: 53, DOWN: 63, LEFT: 57, RIGHT: 59, R3: 150, SET: 1 } },
  { id: 59, content: 'FFB1 BOOST LOW +2', category: 'FFB1', color: 'BLUE', image: 'screens/s059.png', transitions: { UP: 53, DOWN: 63, LEFT: 58, RIGHT: 55, R3: 150, SET: 1 } },
  { id: 60, content: 'FFB1 BOOST HIGH -2', category: 'FFB1', color: 'BLUE', image: 'screens/s060.png', transitions: { UP: 57, DOWN: 66, LEFT: 64, RIGHT: 61, R3: 150, SET: 1 } },
  { id: 61, content: 'FFB1 BOOST HIGH -1', category: 'FFB1', color: 'BLUE', image: 'screens/s061.png', transitions: { UP: 57, DOWN: 66, LEFT: 60, RIGHT: 62, R3: 150, SET: 1 } },
  { id: 62, content: 'FFB1 BOOST HIGH 0', category: 'FFB1', color: 'BLUE', image: 'screens/s062.png', transitions: { UP: 57, DOWN: 66, LEFT: 61, RIGHT: 63, R3: 150, SET: 1 } },
  { id: 63, content: 'FFB1 BOOST HIGH +1', category: 'FFB1', color: 'BLUE', image: 'screens/s063.png', transitions: { UP: 57, DOWN: 66, LEFT: 62, RIGHT: 64, R3: 150, SET: 1 } },
  { id: 64, content: 'FFB1 BOOST HIGH +2', category: 'FFB1', color: 'BLUE', image: 'screens/s064.png', transitions: { UP: 57, DOWN: 66, LEFT: 63, RIGHT: 60, R3: 150, SET: 1 } },
  { id: 65, content: 'FFB1 SPEED LOW', category: 'FFB1', color: 'BLUE', image: 'screens/s065.png', transitions: { UP: 63, DOWN: 70, LEFT: 68, RIGHT: 66, R3: 150, SET: 1 } },
  { id: 66, content: 'FFB1 SPEED MID', category: 'FFB1', color: 'BLUE', image: 'screens/s066.png', transitions: { UP: 63, DOWN: 70, LEFT: 65, RIGHT: 67, R3: 150, SET: 1 } },
  { id: 67, content: 'FFB1 SPEED HIGH', category: 'FFB1', color: 'BLUE', image: 'screens/s067.png', transitions: { UP: 63, DOWN: 70, LEFT: 66, RIGHT: 68, R3: 150, SET: 1 } },
  { id: 68, content: 'FFB1 SPEED EXT', category: 'FFB1', color: 'BLUE', image: 'screens/s068.png', transitions: { UP: 63, DOWN: 70, LEFT: 67, RIGHT: 65, R3: 150, SET: 1 } },
  { id: 69, content: 'FFB1 Wheel DAMPER 0%', category: 'FFB1', color: 'BLUE', image: 'screens/s069.png', transitions: { UP: 66, DOWN: 81, RIGHT: 70, R3: 150, SET: 1 } },
  { id: 70, content: 'FFB1 Wheel DAMPER 10%', category: 'FFB1', color: 'BLUE', image: 'screens/s070.png', transitions: { UP: 66, DOWN: 81, LEFT: 69, RIGHT: 71, R3: 150, SET: 1 } },
  { id: 71, content: 'FFB1 Wheel DAMPER 20%', category: 'FFB1', color: 'BLUE', image: 'screens/s071.png', transitions: { UP: 66, DOWN: 81, LEFT: 70, RIGHT: 72, R3: 150, SET: 1 } },
  { id: 72, content: 'FFB1 Wheel DAMPER 30%', category: 'FFB1', color: 'BLUE', image: 'screens/s072.png', transitions: { UP: 66, DOWN: 81, LEFT: 71, RIGHT: 73, R3: 150, SET: 1 } },
  { id: 73, content: 'FFB1 Wheel DAMPER 40%', category: 'FFB1', color: 'BLUE', image: 'screens/s073.png', transitions: { UP: 66, DOWN: 81, LEFT: 72, RIGHT: 74, R3: 150, SET: 1 } },
  { id: 74, content: 'FFB1 Wheel DAMPER 50%', category: 'FFB1', color: 'BLUE', image: 'screens/s074.png', transitions: { UP: 66, DOWN: 81, LEFT: 73, RIGHT: 75, R3: 150, SET: 1 } },
  { id: 75, content: 'FFB1 Wheel DAMPER 60%', category: 'FFB1', color: 'BLUE', image: 'screens/s075.png', transitions: { UP: 66, DOWN: 81, LEFT: 74, RIGHT: 76, R3: 150, SET: 1 } },
  { id: 76, content: 'FFB1 Wheel DAMPER 70%', category: 'FFB1', color: 'BLUE', image: 'screens/s076.png', transitions: { UP: 66, DOWN: 81, LEFT: 75, RIGHT: 77, R3: 150, SET: 1 } },
  { id: 77, content: 'FFB1 Wheel DAMPER 80%', category: 'FFB1', color: 'BLUE', image: 'screens/s077.png', transitions: { UP: 66, DOWN: 81, LEFT: 76, RIGHT: 78, R3: 150, SET: 1 } },
  { id: 78, content: 'FFB1 Wheel DAMPER 90%', category: 'FFB1', color: 'BLUE', image: 'screens/s078.png', transitions: { UP: 66, DOWN: 81, LEFT: 77, RIGHT: 79, R3: 150, SET: 1 } },
  { id: 79, content: 'FFB1 Wheel DAMPER 100%', category: 'FFB1', color: 'BLUE', image: 'screens/s079.png', transitions: { UP: 66, DOWN: 81, LEFT: 78, R3: 150, SET: 1 } },
  { id: 80, content: 'FFB1 Game DAMPER Gain: LOW', category: 'FFB1', color: 'BLUE', image: 'screens/s080.png', transitions: { UP: 70, DOWN: 85, RIGHT: 81, R3: 150, SET: 1 } },
  { id: 81, content: 'FFB1 Game DAMPER Gain: MID', category: 'FFB1', color: 'BLUE', image: 'screens/s081.png', transitions: { UP: 70, DOWN: 85, LEFT: 80, RIGHT: 82, R3: 150, SET: 1 } },
  { id: 82, content: 'FFB1 Game DAMPER Gain: HIGH', category: 'FFB1', color: 'BLUE', image: 'screens/s082.png', transitions: { UP: 70, DOWN: 85, LEFT: 81, RIGHT: 83, R3: 150, SET: 1 } },
  { id: 83, content: 'FFB1 Game DAMPER Gain: EXT', category: 'FFB1', color: 'BLUE', image: 'screens/s083.png', transitions: { UP: 70, DOWN: 85, LEFT: 82, R3: 150, SET: 1 } },
  { id: 84, content: 'FFB1 SPRING 0%', category: 'FFB1', color: 'BLUE', image: 'screens/s084.png', transitions: { UP: 81, DOWN: 96, RIGHT: 85, R3: 150, SET: 1 } },
  { id: 85, content: 'FFB1 SPRING 10%', category: 'FFB1', color: 'BLUE', image: 'screens/s085.png', transitions: { UP: 81, DOWN: 96, LEFT: 84, RIGHT: 86, R3: 150, SET: 1 } },
  { id: 86, content: 'FFB1 SPRING 20%', category: 'FFB1', color: 'BLUE', image: 'screens/s086.png', transitions: { UP: 81, DOWN: 96, LEFT: 85, RIGHT: 87, R3: 150, SET: 1 } },
  { id: 87, content: 'FFB1 SPRING 30%', category: 'FFB1', color: 'BLUE', image: 'screens/s087.png', transitions: { UP: 81, DOWN: 96, LEFT: 86, RIGHT: 88, R3: 150, SET: 1 } },
  { id: 88, content: 'FFB1 SPRING 40%', category: 'FFB1', color: 'BLUE', image: 'screens/s088.png', transitions: { UP: 81, DOWN: 96, LEFT: 87, RIGHT: 89, R3: 150, SET: 1 } },
  { id: 89, content: 'FFB1 SPRING 50%', category: 'FFB1', color: 'BLUE', image: 'screens/s089.png', transitions: { UP: 81, DOWN: 96, LEFT: 88, RIGHT: 90, R3: 150, SET: 1 } },
  { id: 90, content: 'FFB1 SPRING 60%', category: 'FFB1', color: 'BLUE', image: 'screens/s090.png', transitions: { UP: 81, DOWN: 96, LEFT: 89, RIGHT: 91, R3: 150, SET: 1 } },
  { id: 91, content: 'FFB1 SPRING 70%', category: 'FFB1', color: 'BLUE', image: 'screens/s091.png', transitions: { UP: 81, DOWN: 96, LEFT: 90, RIGHT: 92, R3: 150, SET: 1 } },
  { id: 92, content: 'FFB1 SPRING 80%', category: 'FFB1', color: 'BLUE', image: 'screens/s092.png', transitions: { UP: 81, DOWN: 96, LEFT: 91, RIGHT: 93, R3: 150, SET: 1 } },
  { id: 93, content: 'FFB1 SPRING 90%', category: 'FFB1', color: 'BLUE', image: 'screens/s093.png', transitions: { UP: 81, DOWN: 96, LEFT: 92, RIGHT: 94, R3: 150, SET: 1 } },
  { id: 94, content: 'FFB1 SPRING 100%', category: 'FFB1', color: 'BLUE', image: 'screens/s094.png', transitions: { UP: 81, DOWN: 96, LEFT: 93, R3: 150, SET: 1 } },
  { id: 95, content: 'FFB1 GEAR JOLT OFF', category: 'FFB1', color: 'BLUE', image: 'screens/s095.png', transitions: { UP: 85, DOWN: 99, LEFT: 98, RIGHT: 96, R3: 150, SET: 1 } },
  { id: 96, content: 'FFB1 GEAR JOLT LOW', category: 'FFB1', color: 'BLUE', image: 'screens/s096.png', transitions: { UP: 85, DOWN: 99, LEFT: 95, RIGHT: 97, R3: 150, SET: 1 } },
  { id: 97, content: 'FFB1 GEAR JOLT MID', category: 'FFB1', color: 'BLUE', image: 'screens/s097.png', transitions: { UP: 85, DOWN: 99, LEFT: 96, RIGHT: 98, R3: 150, SET: 1 } },
  { id: 98, content: 'FFB1 GEAR JOLT HIGH', category: 'FFB1', color: 'BLUE', image: 'screens/s098.png', transitions: { UP: 85, DOWN: 99, LEFT: 97, RIGHT: 95, R3: 150, SET: 1 } },
  { id: 99, content: 'FFB1 Engine ROAR OFF', category: 'FFB1', color: 'BLUE', image: 'screens/s099.png', transitions: { UP: 96, DOWN: 104, LEFT: 102, RIGHT: 100, R3: 150, SET: 1 } },
  { id: 100, content: 'FFB1 Engine ROAR LOW', category: 'FFB1', color: 'BLUE', image: 'screens/s100.png', transitions: { UP: 96, DOWN: 104, LEFT: 99, RIGHT: 101, R3: 150, SET: 1 } },
  { id: 101, content: 'FFB1 Engine ROAR MID', category: 'FFB1', color: 'BLUE', image: 'screens/s101.png', transitions: { UP: 96, DOWN: 104, LEFT: 100, RIGHT: 102, R3: 150, SET: 1 } },
  { id: 102, content: 'FFB1 Engine ROAR HIGH', category: 'FFB1', color: 'BLUE', image: 'screens/s102.png', transitions: { UP: 96, DOWN: 104, LEFT: 101, RIGHT: 99, R3: 150, SET: 1 } },
  { id: 103, content: 'FFB1 END STOP LOW', category: 'FFB1', color: 'BLUE', image: 'screens/s103.png', transitions: { UP: 99, LEFT: 105, RIGHT: 104, R3: 150, SET: 1 } },
  { id: 104, content: 'FFB1 END STOP MID', category: 'FFB1', color: 'BLUE', image: 'screens/s104.png', transitions: { UP: 99, LEFT: 103, RIGHT: 105, R3: 150, SET: 1 } },
  { id: 105, content: 'FFBD MODE BSPE', category: 'FFBD', color: 'BLUE', image: 'screens/s105.png', transitions: { UP: 99, LEFT: 104, RIGHT: 103, R3: 150, SET: 1 } },
  { id: 106, content: 'FFBD INERTIA OFF', category: 'FFBD', color: 'BLUE', image: 'screens/s106.png', transitions: { UP: 27, DOWN: 107, R3: 150, SET: 1 } },
  { id: 107, content: 'FFBD FRICTION MID', category: 'FFBD', color: 'BLUE', image: 'screens/s107.png', transitions: { UP: 106, DOWN: 108, R3: 150, SET: 1 } },
  { id: 108, content: 'FFBD BOOST LOW 0', category: 'FFBD', color: 'BLUE', image: 'screens/s108.png', transitions: { UP: 107, DOWN: 109, R3: 150, SET: 1 } },
  { id: 109, content: 'FFB1 END STOP HIGH', category: 'FFB1', color: 'BLUE', image: 'screens/s109.png', transitions: { UP: 108, DOWN: 110, R3: 150, SET: 1 } },
  { id: 110, content: 'FFBD BOOST HIGH 0', category: 'FFBD', color: 'BLUE', image: 'screens/s110.png', transitions: { UP: 109, DOWN: 111, R3: 150, SET: 1 } },
  { id: 111, content: 'FFBD SPEED MID', category: 'FFBD', color: 'BLUE', image: 'screens/s111.png', transitions: { UP: 110, DOWN: 112, R3: 150, SET: 1 } },
  { id: 112, content: 'FFBD Wheel DAMPER 20%', category: 'FFBD', color: 'BLUE', image: 'screens/s112.png', transitions: { UP: 111, DOWN: 113, R3: 150, SET: 1 } },
  { id: 113, content: 'FFBD Game DAMPER Gain: LOW', category: 'FFBD', color: 'BLUE', image: 'screens/s113.png', transitions: { UP: 112, DOWN: 114, R3: 150, SET: 1 } },
  { id: 114, content: 'FFBD SPRING 0%', category: 'FFBD', color: 'BLUE', image: 'screens/s114.png', transitions: { UP: 113, DOWN: 115, R3: 150, SET: 1 } },
  { id: 115, content: 'FFBD GEAR JOLT OFF', category: 'FFBD', color: 'BLUE', image: 'screens/s115.png', transitions: { UP: 114, DOWN: 116, R3: 150, SET: 1 } },
  { id: 116, content: 'FFBD Engine ROAR OFF', category: 'FFBD', color: 'BLUE', image: 'screens/s116.png', transitions: { UP: 115, DOWN: 117, R3: 150, SET: 1 } },
  { id: 117, content: 'FFBD END STOP HIGH', category: 'FFBD', color: 'BLUE', image: 'screens/s117.png', transitions: { UP: 116, R3: 150, SET: 1 } },
  { id: 118, content: 'FW 1.25  (base firmware)', category: 'FIRMWARE', color: 'BLUE', image: 'screens/s118.png', transitions: { DOWN: 119, LEFT: 22, RIGHT: 135, R3: 150, SET: 1 } },
  { id: 119, content: 'ROTATION AUTO', category: 'ROTATION', color: 'BLUE', image: 'screens/s119.png', transitions: { UP: 118, DOWN: 130, LEFT: 125, RIGHT: 120, R3: 150, SET: 1 } },
  { id: 120, content: 'ROTATION 180', category: 'ROTATION', color: 'BLUE', image: 'screens/s120.png', transitions: { UP: 118, DOWN: 130, LEFT: 119, RIGHT: 121, R3: 150, SET: 1 } },
  { id: 121, content: 'ROTATION 270', category: 'ROTATION', color: 'BLUE', image: 'screens/s121.png', transitions: { UP: 118, DOWN: 130, LEFT: 120, RIGHT: 122, R3: 150, SET: 1 } },
  { id: 122, content: 'ROTATION 360', category: 'ROTATION', color: 'BLUE', image: 'screens/s122.png', transitions: { UP: 118, DOWN: 130, LEFT: 121, RIGHT: 123, R3: 150, SET: 1 } },
  { id: 123, content: 'ROTATION 540', category: 'ROTATION', color: 'BLUE', image: 'screens/s123.png', transitions: { UP: 118, DOWN: 130, LEFT: 122, RIGHT: 124, R3: 150, SET: 1 } },
  { id: 124, content: 'ROTATION 900', category: 'ROTATION', color: 'BLUE', image: 'screens/s124.png', transitions: { UP: 118, DOWN: 130, LEFT: 123, RIGHT: 125, R3: 150, SET: 1 } },
  { id: 125, content: 'ROTATION 1080', category: 'ROTATION', color: 'BLUE', image: 'screens/s125.png', transitions: { UP: 118, DOWN: 130, LEFT: 124, RIGHT: 119, R3: 150, SET: 1 } },
  { id: 126, content: 'Wheel calibration 90%', category: 'CALIBRATION', color: 'BLUE', image: 'screens/s126.png', transitions: { UP: 119, R3: 150, SET: 1, LPADDLE: 127 } },
  { id: 127, content: 'Wheel calibration 80%', category: 'CALIBRATION', color: 'BLUE', image: 'screens/s127.png', transitions: { R3: 150, SET: 1, LPADDLE: 128, RPADDLE: 126 } },
  { id: 128, content: 'Wheel calibration 70%', category: 'CALIBRATION', color: 'BLUE', image: 'screens/s128.png', transitions: { R3: 150, SET: 1, LPADDLE: 129, RPADDLE: 127 } },
  { id: 129, content: 'Wheel calibration 60%', category: 'CALIBRATION', color: 'BLUE', image: 'screens/s129.png', transitions: { R3: 150, SET: 1, LPADDLE: 130, RPADDLE: 128 } },
  { id: 130, content: 'Wheel calibration 50%', category: 'CALIBRATION', color: 'BLUE', image: 'screens/s130.png', transitions: { UP: 119, R3: 150, SET: 1, LPADDLE: 131, RPADDLE: 129 } },
  { id: 131, content: 'Wheel calibration 40%', category: 'CALIBRATION', color: 'BLUE', image: 'screens/s131.png', transitions: { R3: 150, SET: 1, LPADDLE: 132, RPADDLE: 130 } },
  { id: 132, content: 'Wheel calibration 30%', category: 'CALIBRATION', color: 'BLUE', image: 'screens/s132.png', transitions: { R3: 150, SET: 1, LPADDLE: 133, RPADDLE: 131 } },
  { id: 133, content: 'Wheel calibration ~35%', category: 'CALIBRATION', color: 'BLUE', image: 'screens/s133.png', transitions: { R3: 150, SET: 1, LPADDLE: 134, RPADDLE: 132 } },
  { id: 134, content: 'Wheel calibration 100%', category: 'CALIBRATION', color: 'BLUE', image: 'screens/s134.png', transitions: { UP: 119, R3: 150, SET: 1, RPADDLE: 133 } },
  { id: 135, content: 'PEDALS (select)', category: 'PEDALS (type)', color: 'BLUE', image: 'screens/s135.png', transitions: { DOWN: 136, LEFT: 118, RIGHT: 13, R3: 150, SET: 1 } },
  { id: 136, content: 'Pedal MODE: TRLP', category: 'PEDALS (type)', color: 'BLUE', image: 'screens/s136.png', transitions: { UP: 135, DOWN: 139, LEFT: 138, RIGHT: 137, R3: 150, SET: 1 } },
  { id: 137, content: 'Pedal MODE: T3PA', category: 'PEDALS (type)', color: 'BLUE', image: 'screens/s137.png', transitions: { UP: 135, DOWN: 148, LEFT: 136, RIGHT: 138, R3: 150, SET: 1 } },
  { id: 138, content: 'Pedal MODE: TLCM', category: 'PEDALS (type)', color: 'BLUE', image: 'screens/s138.png', transitions: { UP: 135, DOWN: 148, LEFT: 137, RIGHT: 136, R3: 150, SET: 1 } },
  { id: 139, content: 'Pedal MODE (variant)', category: 'PEDALS (type)', color: 'BLUE', image: 'screens/s139.png', transitions: { UP: 136, DOWN: 141, LEFT: 140, RIGHT: 140, R3: 150, SET: 1 } },
  { id: 140, content: 'Pedal MODE (variant)', category: 'PEDALS (type)', color: 'BLUE', image: 'screens/s140.png', transitions: { UP: 136, DOWN: 141, LEFT: 139, RIGHT: 139, R3: 150, SET: 1 } },
  { id: 141, content: 'DEADZONE Gas (min-max)', category: 'PEDALS (deadzone)', color: 'BLUE', image: 'screens/s141.png', transitions: { UP: 139, DOWN: 143, LEFT: 142, RIGHT: 142, R3: 150, SET: 1 } },
  { id: 142, content: 'DEADZONE Gas (min-max)', category: 'PEDALS (deadzone)', color: 'BLUE', image: 'screens/s142.png', transitions: { UP: 139, DOWN: 143, LEFT: 142, RIGHT: 142, R3: 150, SET: 1 } },
  { id: 143, content: 'DEADZONE Brake (min-max)', category: 'PEDALS (deadzone)', color: 'BLUE', image: 'screens/s143.png', transitions: { UP: 141, DOWN: 146, LEFT: 144, RIGHT: 144, R3: 150, SET: 1 } },
  { id: 144, content: 'DEADZONE Brake (min-max)', category: 'PEDALS (deadzone)', color: 'BLUE', image: 'screens/s144.png', transitions: { UP: 141, DOWN: 146, LEFT: 144, RIGHT: 144, R3: 150, SET: 1 } },
  { id: 145, content: 'DEADZONE Clutch (min-max)', category: 'PEDALS (deadzone)', color: 'BLUE', image: 'screens/s145.png', transitions: { UP: 143, DOWN: 146, R3: 150, SET: 1 } },
  { id: 146, content: 'DEADZONE Clutch (min-max)', category: 'PEDALS (deadzone)', color: 'BLUE', image: 'screens/s146.png', transitions: { UP: 143, LEFT: 141, RIGHT: 147, R3: 150, SET: 1 } },
  { id: 147, content: 'Pedal RESET ? NO/YES', category: 'PEDALS (reset)', color: 'BLUE', image: 'screens/s147.png', transitions: { CENTER: 141 } },
  { id: 148, content: 'OK (check)', category: 'PEDALS (reset)', color: 'BLUE', image: 'screens/s148.png', transitions: { UP: 137, LEFT: 149, RIGHT: 149, R3: 150, SET: 1 } },
  { id: 149, content: 'Dashboard layout (icon)', category: 'DASHBOARD (layout)', color: 'BLUE', image: 'screens/s149.png', transitions: { UP: 137, LEFT: 148, RIGHT: 148, R3: 150, SET: 1 } },
  { id: 150, content: 'DASHBOARD  (layout/home)', category: 'DASHBOARD (layout)', color: 'BLUE', image: 'screens/s150.png', transitions: { UP: 151, DOWN: 151, LEFT: 159, RIGHT: 152, L3: 22, SET: 1 } },
  { id: 151, content: 'Dashboard layout (red car)', category: 'DASHBOARD (layout)', color: 'BLUE', image: 'screens/s151.png', transitions: { UP: 150, DOWN: 150, LEFT: 159, RIGHT: 152, L3: 22, SET: 1 } },
  { id: 152, content: 'Dashboard layout (blue car)', category: 'DASHBOARD (layout)', color: 'BLUE', image: 'screens/s152.png', transitions: { LEFT: 150, RIGHT: 153, L3: 22, SET: 1 } },
  { id: 153, content: 'Telemetry: GEAR', category: 'DASHBOARD (telemetry)', color: 'BLUE', image: 'screens/s153.png', transitions: { LEFT: 152, RIGHT: 154, L3: 22, SET: 1 } },
  { id: 154, content: 'Telemetry: SPEED', category: 'DASHBOARD (telemetry)', color: 'BLUE', image: 'screens/s154.png', transitions: { LEFT: 153, RIGHT: 155, L3: 22, SET: 1 } },
  { id: 155, content: 'Telemetry: POSITION', category: 'DASHBOARD (telemetry)', color: 'BLUE', image: 'screens/s155.png', transitions: { LEFT: 154, RIGHT: 156, L3: 22, SET: 1 } },
  { id: 156, content: 'Telemetry: LAP', category: 'DASHBOARD (telemetry)', color: 'BLUE', image: 'screens/s156.png', transitions: { UP: 158, DOWN: 157, LEFT: 155, RIGHT: 159, L3: 22, SET: 1 } },
  { id: 157, content: 'Telemetry: TIME CL (current lap)', category: 'DASHBOARD (telemetry)', color: 'BLUE', image: 'screens/s157.png', transitions: { UP: 156, DOWN: 158, LEFT: 155, RIGHT: 159, L3: 22, SET: 1 } },
  { id: 158, content: 'Telemetry: TIME LL (last lap)', category: 'DASHBOARD (telemetry)', color: 'BLUE', image: 'screens/s158.png', transitions: { UP: 157, DOWN: 156, LEFT: 155, RIGHT: 159, L3: 22, SET: 1 } },
  { id: 159, content: 'Telemetry: TIME BL (best lap)', category: 'DASHBOARD (telemetry)', color: 'BLUE', image: 'screens/s159.png', transitions: { LEFT: 156, RIGHT: 150, L3: 22, SET: 1 } },
  { id: 160, content: 'Telemetry: RPM', category: 'DASHBOARD (telemetry)', color: 'RED', image: 'screens/s160.png', transitions: {} },
]

export const T598_SCREENS_BY_ID: Record<number, T598Screen> = T598_SCREENS.reduce(
  (acc, screen) => {
    acc[screen.id] = screen
    return acc
  },
  {} as Record<number, T598Screen>,
)
