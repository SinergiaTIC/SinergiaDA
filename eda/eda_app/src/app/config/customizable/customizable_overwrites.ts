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
        // Confirm: classic olive, flat like the old UI
        confirmBg:        '#b4bc32',  // Gradient start
        confirmBgEnd:     '#b4bc32',  // Gradient end (= start → flat)
        confirmHoverBg:   '#8f9626',  // Hover start (darker olive)
        confirmHoverBgEnd:'#8f9626',  // Hover end (darker olive)

        // Auxiliary: secondary action (unchanged from defaults)
        auxBg:            '#1D4ED8',  // Gradient start (blue-700)
        auxBgEnd:         '#3B82F6',  // Gradient end (blue-500)
        auxHoverBg:       '#1E40AF',  // Hover start (blue-800)
        auxHoverBgEnd:    '#2563EB',  // Hover end (blue-600)

        // Cancel: discard action (unchanged from defaults)
        cancelBg:         '#df4040',  // Gradient start
        cancelBgEnd:      '#ec2828',  // Gradient end
        cancelHoverBg:    'rgb(177, 39, 39)',  // Hover start
        cancelHoverBgEnd: '#bd3636',  // Hover end
    },
};

export const DEFAULT_FONT_FAMILY: string = 'Questrial'; /* THIS MUST BE SET ALSO IN eda_app/src/assets/sass/css/custom.css */
export const DEFAULT_FONT_COLOR: string = '#67757c';
export const DEFAULT_HOME_BACKGROUND_COLOR: string = '#ffffff';
export const DEFAULT_BACKGROUND_COLOR: string = '#ffffff';
export const LogoImage = 'assets/images/logos/logo_sda.png';      // Login logo: SinergiaDA (new asset, originals untouched)
export const LogoSidebar = 'assets/images/logos/logo_sda.png';    // Left sidebar logo: SinergiaDA
export const SubLogoImage = 'assets/images/logos/sub-logo_sda.png'; // Login sub-logo: SinergiaDA
