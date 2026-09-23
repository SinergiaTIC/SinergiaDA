/** place here the variables you want to overwrittes */

export const SHOW_LOCK_IN_PANEL_HEADER: boolean = true; // true → lock button visible in panel header | false → lock in context menu
export const ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS: boolean = false; // true → public visibility option shown in dashboard creation/edit UIs | false → hidden
export const USE_VALUE_LIST_CODE_FOR_FILTERS: boolean = true; // true -> For using the filters with code values.
export const SHOW_HIDDEN_FIELDS: 'disabled' | 'admin-only' | 'all' = 'admin-only'; // 'disabled' → button hidden for everyone | 'admin-only' → only admins see the button | 'all' → all users see it
export const ALLOWED_QUERY_MODES: string[] = ['TREE', 'SQL']; // ALLOWED_QUERY_MODES Order matters; the first value "ALLOWED_QUERY_MODES[0]" is considered the default query mode
export const SHOW_WHAT_IF: boolean = false; // SDA: sin escenarios "What If"
export const ALLOWED_JOIN_TYPES: string[] = ['left', 'inner'];
export const SHOW_CUSTOM_ACTION: boolean = false;
export const SHOW_ZOOM_IN_SIDEBAR: boolean = false;
export const PRIVATE_EDITION_ACTIVATED: boolean =  false;

/** Classic theme (level 1) — approach the 2.x look.
 *  Source values measured on :8082 (computed styles):
 *  primary action button #B4BC32 solid + black text, body text #67757c, white background, Questrial.
 *  NOTE: overriding the whole CORPORATE_COLORS object is required — apply-overwrites.js
 *  replaces declarations by name, so a partial object would drop chat/folder/buttons keys. */
export const CORPORATE_COLORS = {
    // Base brand colors — classic SDA olive
    primary:         '#b4bc32',      // Primary color (buttons, icons, gradients)
    primaryGradient: '#b4bc32',      // Gradient end = start → flat solid like the old UI
    primaryRgb:      '180, 188, 50',  // RGB value of the primary for opacity uses (box-shadow, rgba)
    primaryHsl:      '63 58% 47%', // HSL components of the primary for --ring (Tailwind focus ring)

    // Chatbot-specific colors (unchanged from defaults — out of scope for level 1)
    chat: {
        avatarBg:       '#CCFAF7',   // Robot avatar background (header and messages)
        avatarBgAlt:    '#99F0EB',   // Alternative avatar background (empty state gradient)
        avatarBorder:   '#55D6CD',   // Avatar border and table header
        surfaceHover:   '#E6FAF9',   // Hover background for suggestions and table rows
        tableHeader:    '#007B74',   // Text color in table headers
        linkColor:      '#00bfb3',   // Link color in messages
        linkHoverColor: '#008F87',   // Link color on hover
    },

    // Folder-specific colors (unchanged from defaults — out of scope for level 1)
    folder: {
        iconBg:          '#CCFAF7',  // Closed folder icon background
        iconBgHover:     '#99F0EB',  // Hover or open folder icon background
        iconColor:       '#00BFB3',  // Closed folder icon color
        borderHover:     '#34D0C7',  // Folder card border on hover or when open
        iconColorHover:  '#007B74',  // Icon and text color on hover or when open
        cardBgOpen:      '#E6FAF9',  // Card background when the folder is open
        labelColorOpen:  '#005E58',  // Folder name color when open
    },

    // Action button colors in dialogs
    buttons: {
        // Confirm: classic olive, flat solid (start = end); hover slightly lighter
        confirmBg:        '#b4bc32',  // Solid fill
        confirmBgEnd:     '#b4bc32',  // = start → flat
        confirmHoverBg:   '#c2ca52',  // Hover: slightly lighter olive
        confirmHoverBgEnd:'#c2ca52',  // = hover start → flat

        // Auxiliary: secondary action — flat solid (start = end); hover slightly lighter
        auxBg:            '#1D4ED8',  // Solid fill
        auxBgEnd:         '#1D4ED8',  // = start → flat
        auxHoverBg:       '#3568e0',  // Hover: slightly lighter blue
        auxHoverBgEnd:    '#3568e0',  // = hover start → flat

        // Cancel: discard action — flat solid (start = end); hover slightly lighter
        cancelBg:         '#df4040',  // Solid fill
        cancelBgEnd:      '#df4040',  // = start → flat
        cancelHoverBg:    '#e76060',  // Hover: slightly lighter red
        cancelHoverBgEnd: '#e76060',  // = hover start → flat
    },
};

export const DEFAULT_FONT_FAMILY: string = 'Questrial'; /* THIS MUST BE SET ALSO IN eda_app/src/assets/sass/css/custom.css */
export const DEFAULT_FONT_COLOR: string = '#67757c';
export const DEFAULT_HOME_BACKGROUND_COLOR: string = '#f1f0f0'; // Page background fallback (2.x value)
export const DEFAULT_BACKGROUND_COLOR: string = '#f1f0f0'; // Report/page background (2.x value)
export const LogoImage = 'assets/images/logos/logo_sda.png';      // Login logo: SinergiaDA (new asset, originals untouched)
export const LogoSidebar = 'assets/images/logos/logo_sda.png';    // Left sidebar logo: SinergiaDA
export const SubLogoImage = 'assets/images/logos/sub-logo_sda.png'; // Login sub-logo: SinergiaDA

/** Charts palettes — SinergiaDA first and set as default.
 *  NOTE: overriding ChartsPalettes replaces the whole array, so every palette
 *  from customizable_default.ts must be repeated here (apply-overwrites.js).
 *  The SinergiaDA palette is built around the corporate olive #b4bc32 with
 *  analogous (yellow-green/olive/green), complementary (violet/magenta) and
 *  triadic (blue, red/orange) tones. */
export const ChartsPalettes = [
    {
        name: 'SinergiaDA',
        paleta: [
            '#b4bc32', // corporate olive (brand primary)
            '#8f9626', // darker olive (hover tone)
            '#d4da5e', // light olive
            '#6b8e23', // olive green
            '#3f9142', // deep green (analogous)
            '#7ac143', // fresh green
            '#2f9e8f', // teal-green (analogous)
            '#1f7a8c', // petrol blue (triadic)
            '#2d6cdf', // blue (triadic)
            '#6c4bd6', // violet (complementary of olive-yellow)
            '#9b4dca', // purple
            '#c74ba0', // magenta
            '#e0517a', // pink-red
            '#e0693b', // orange (triadic)
            '#e8a33d', // amber
            '#f2cf8c', // sand (light neutral)
            '#8799a3', // slate grey (neutral)
            '#4a5568', // dark slate
        ],
    },
    {
        paleta: [
            '#10B4BD',
            '#3C88CA',
            '#685CD9',
            '#8B5DD2',
            '#A36AC7',
            '#BB78BD',
            '#D285B3',
            '#EA93A9',
            '#F7A68E',
            '#FCB37A',
            '#FDB0BA',
            '#FBBFA6',
            '#F9C98F',
            '#F6D278',
            '#ECE45A'
        ],
        name: 'Gradiente'
    },
    {
        paleta: [
  '#6ECBD3', // soft cyan
  '#C59BEF', // lavender
  '#DCEB8E', // light pastel green
  '#F2B98E', // soft peach
  '#E4C7F5', // light lilac
  '#79BDEB', // sky blue
  '#E89BCB', // soft pink
  '#A8E6C1', // mint green
  '#879CEB', // lavender blue
  '#F2CF8C', // soft yellow
  '#7EDBD1', // light turquoise
  '#F29C9C', // pastel coral
  '#C6E88E', // soft lime green
  '#9C8EEB', // soft violet
  '#8FD8F2', // ice blue
  '#F2A8D8', // dusty rose
  '#C3B6F2', // light mauve
  '#B8EED1', // aqua green
  '#F4C7A1', // apricot
  '#8FE3D0', // bluish mint
  '#D9F0A3', // light pistachio
  '#F5B8E4', // light pink
  '#A8E1F2', // pastel sky blue
  '#F4DA8E', // butter yellow
  '#B19CF2'  // final light violet
        ]
        , name: 'Contraste'
    }, {
        paleta: [
            '#5C86A6', '#F7DB86', '#69C8BC', '#A66B5C', '#8FE7ED',
            '#FFB56B', '#8C8C8C', '#CDE67D', '#D7B28E', '#74BFC3',
            '#050504', '#F2A7A3', '#7FC4A7', '#FFD1A0', '#73A7C6',
            '#B8A0F2', '#7BE2CF', '#F2A0EE', '#8EE0A6', '#FFB1C0',
            '#A8CCFF', '#FFB08A', '#C3CEDD', '#C7E87D', '#FFD59A'
        ]
        , name: 'Nocturna'
    },
    {
        paleta: [
            '#7FEFD1', '#6FE3D6', '#7AD3E0', '#8BC6EA', '#9ABCF3',
            '#7AA6D9', '#5D86C9', '#476CB8', '#3353A6','#2A4A90',
             '#1F3F7A', '#162F5E', '#0F223F', '#0B1A2B','#2C2C2C',
             '#6C7A7C', '#8A989A', '#A7B3B5', '#C3CCCD', '#D6DEDF',
            '#E6EFF0', '#B9E7E4', '#A4D8DF', '#93C6D1'
        ]
        , name: 'Menta'
    },
    {
        paleta: [
  '#025F8F',
  '#027BB0',
  '#0296D1',
  '#0C9BD3',
  '#169FD5',
  '#20A4D7',
  '#2AA8D9',
  '#34ADDB',
  '#3EB1DD',
  '#48B6DF',
  '#52BAE1',
  '#5CBFE3',
  '#66C3E5',
  '#70C8E7',
  '#7ACCE9',
  '#84D1EB',
  '#8ED5ED',
  '#98DAEF',
  '#A2DEF0',
  '#ACE3F2',
  '#B6E7F4',
  '#C0ECF6',
  '#CAF0F8'
        ]
        , name: 'Celeste'
    },
    {
        paleta: [
            '#425EEB', '#CA42EB', '#4192EB', '#9342EB', '#5C42EB',
            '#7DD3FC', '#7C3AED', '#60A5FA', '#A855F7', '#2563EB',
            '#C084FC', '#1D4ED8', '#D8B4FE', '#0F172A', '#93C5FD',
            '#4C1D95', '#38BDF8', '#6D28D9', '#E879F9', '#312E81',
            '#A78BFA', '#2DD4BF', '#F0ABFC', '#8DA2FB', '#9E90EB'
        ]
        , name: 'psique'
    },
    {
        paleta: [
            '#425EEB', '#00E5FF', '#CA42EB', '#00FF85', '#FF2BD6',
            '#4192EB', '#FFB000', '#9342EB', '#FF3D00', '#5C42EB',
            '#00C2FF', '#FF00A8', '#00FFCC', '#7C3AED', '#00FF3C',
            '#2563EB', '#FFD400', '#A855F7', '#FF006E', '#00A8FF',
            '#C084FC', '#00FF9A', '#FF4D8D', '#2D2AFF', '#9E90EB'
        ]
        , name: 'solido'
    },
];

export const DEFAULT_PALETTE_COLOR: any = ChartsPalettes.find(palette => palette.name === 'SinergiaDA');
