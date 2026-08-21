/**
 * i18n strings — English and Urdu.
 *
 * Rule from `docs/PROJECT_CONTEXT.md`: every user-facing string ships in both
 * locales in the same commit. Urdu is Tier 1, never a later polish pass.
 *
 * `en` is the shape; `ur` must satisfy the same keys, so a missing translation
 * is a type error rather than a runtime fallback nobody notices.
 */

export const en = {
  common: {
    appName: "Rukhsat",
    search: "Search",
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    edit: "Edit",
    remove: "Remove",
    revoke: "Revoke",
    confirm: "Confirm",
    back: "Back",
    loading: "Loading…",
    empty: "Nothing here yet",
    today: "Today",
    minutes: "min",
    seconds: "sec",
    online: "Online",
    offline: "Offline",
    all: "All",
    of: "of",
  },
  nav: {
    dashboard: "Dashboard",
    people: "People",
    schools: "Schools",
    classes: "Classes",
    students: "Students",
    guardians: "Guardians",
    staff: "Staff",
    drivers: "Drivers",
    operations: "Operations",
    queue: "Live queue",
    devices: "Classroom displays",
    audio: "Name recordings",
    records: "Records",
    audit: "Audit log",
    announcements: "Announcements",
    analytics: "Analytics",
  },
  auth: {
    signIn: "Sign in",
    phone: "Phone number",
    password: "Password",
    signInCta: "Sign in",
    subtitle: "Administrator access",
    parentSubtitle: "Parents, relatives and drivers all sign in here.",
    staffSubtitle: "Teachers and gate guards. Your role decides what you see.",
    phoneFormat: "Enter an 11-digit mobile number, starting 03 — for example 03001234567.",
    phoneRequired: "Enter your phone number.",
    passwordRequired: "Enter your password.",
    phoneQuestion: "What's your phone number?",
    phoneHint: "The number your school has on file.",
    passwordQuestion: "Enter your password",
  },
  register: {
    // Entry
    noAccount: "Don't have an account?",
    createAccount: "Create account",
    haveAccount: "Already have an account?",
    chooseRole: "Who are you?",
    iAmParent: "I am a parent",
    iAmParentHint: "Your children are already enrolled at the school.",
    iAmDriver: "I drive a van",
    iAmDriverHint: "Parents will add you themselves. The school is not involved.",

    // Shared fields
    fullName: "Full name",
    fullNameUr: "Name in Urdu (optional)",
    cnic: "CNIC number",
    cnicHint: "13 digits, as printed on your card",
    confirmPassword: "Confirm password",
    school: "School",
    selectSchool: "Select your school",
    submit: "Create account",
    submitting: "Creating your account…",
    nameQuestion: "What's your name?",
    phoneQuestionHint: "You will sign in with this number.",
    driverPhoneHint: "Parents will add you using this number, so it has to be right.",
    vanQuestion: "Tell us about your van",
    photosQuestion: "Two photos, taken now",
    photosHint:
      "A parent has to recognise your face before she lets you collect her child. Camera only — no gallery.",
    cnicQuestion: "What's your CNIC number?",
    passwordQuestion: "Choose a password",
    passwordHint: "At least 8 characters.",

    // Parent result
    parentTitle: "Parent registration",
    parentIntro:
      "We match you to your children using your CNIC — the same number the school has on file.",
    foundChildren: "We found your children",
    foundChildrenBody: "Check the names below are right, then sign in.",
    noMatchTitle: "Your account is ready",
    // Deliberately not phrased as a failure. The account exists; only the link
    // is missing, and the school fixes it in one phone call.
    noMatchBody:
      "We could not match any children to this CNIC yet. The school may have another guardian's number on file. Phone the school and they will link your account — you can sign in now either way.",

    // Driver
    driverTitle: "Driver registration",
    driverIntro:
      "Register once. Parents find you by phone number and add you themselves.",
    vehicleNumber: "Vehicle registration number",
    vehicleNumberHint: "For example LEA-1234",
    capacity: "Seats",
    expectedArrival: "Usual arrival time at school",
    expectedArrivalHint:
      "The time you normally reach the gate. This is what tells the school you are coming, even on a day your phone loses signal.",
    selfie: "Your photo",
    selfieHint: "Taken with the camera now — parents check this before adding you.",
    idCard: "Your CNIC card",
    idCardHint: "Photograph the front of the card, with the number readable.",
    takePhoto: "Take photo",
    retakePhoto: "Retake",
    photosRequired: "Both photos are needed before you can register.",
    cameraNeeded: "Camera access",
    cameraNeededBody:
      "Both photos must be taken now with the camera. A picture chosen from the gallery could be anyone.",
    allowCamera: "Allow camera",
    driverDoneTitle: "You are registered",
    driverDoneBody:
      "You are not attached to any school yet. A parent must add you before any child appears on your list. Give them the phone number you registered with.",

    // Errors
    phoneTaken: "That phone number is already registered. Sign in instead.",
    cnicInvalid: "A CNIC is 13 digits.",
    passwordShort: "Use at least 8 characters.",
    passwordMismatch: "The two passwords do not match.",
    nameShort: "Enter your full name.",
    vehicleRequired: "Enter your vehicle registration number.",
    schoolRequired: "Choose your school.",
    failed: "Could not create your account. Please try again.",
  },
  adminSignup: {
    cta: "Register your school",
    haveAccount: "Already registered?",
    title: "Register your school",
    subtitle: "Two steps. You will be signed in at the end.",
    stepOf: "Step",
    // Step 1 — the administrator
    step1Title: "Your administrator account",
    step1Body: "You will manage the school with this login.",
    yourName: "Your full name",
    yourNameUr: "Your name in Urdu (optional)",
    phone: "Phone number",
    phoneHint: "You will sign in with this.",
    password: "Password",
    passwordHint: "At least 8 characters.",
    confirmPassword: "Confirm password",
    next: "Next",
    back: "Back",
    // Step 2 — the school
    step2Title: "Your school",
    step2Body:
      "The location and radius decide when the system says a collector is nearly here — so put the pin on the gate parents actually use, not the middle of the campus.",
    schoolName: "School name",
    schoolNamePlaceholder: "Bahria Foundation School",
    dismissalTime: "Dismissal time",
    dismissalHint: "When the school day ends.",
    findLocation: "Search for an address",
    findPlaceholder: "Area, city — e.g. Bahria Town, Islamabad",
    search: "Search",
    searching: "Searching…",
    noResults: "No place found by that name. Drag the pin instead.",
    orDropPin: "Or tap the map to place the pin exactly.",
    pinnedAt: "Pinned at",
    useMyLocation: "Use my current location",
    radius: "Arrival radius",
    radiusHint:
      "How far from the gate a collector counts as arriving. About 1 km suits most schools.",
    createAccount: "Create school and account",
    creating: "Setting up your school…",
    // Errors
    nameRequired: "Enter your full name.",
    phoneRequired: "Enter a phone number.",
    passwordShort: "Use at least 8 characters.",
    passwordMismatch: "The two passwords do not match.",
    schoolNameRequired: "Enter the school name.",
    locationRequired: "Place the pin on your school first.",
    phoneTaken: "That phone number is already registered. Sign in instead.",
    failed: "Could not create your school. Please try again.",
  },
  onboarding: {
    // Parent / collector app
    p1Title: "Your child leaves with the right person",
    p1Body:
      "Only someone you have authorised can collect. The gate checks, every single time.",
    p2Title: "No more waiting in the queue",
    p2Body:
      "Tap \"On my way\" and your child is brought to the gate as you arrive — not after.",
    p3Title: "A code that cannot be copied",
    p3Body:
      "It changes every minute and works without signal, so a screenshot is worth nothing.",

    // Staff app
    s1Title: "Every handover, verified",
    s1Body:
      "Scan the collector's code at the gate. It is checked on this device, with or without signal.",
    s2Title: "Your class, in arrival order",
    s2Body:
      "Children are listed by how close their collector actually is — never by who booked first.",
    s3Title: "Never turn a family away",
    s3Body:
      "If a phone is dead, the manual handover is one tap away. It is logged, and it always works.",
  },
  walkthrough: {
    next: "Next",
    start: "Get started",
    skip: "Skip",
    replay: "Show the guide again",
    takeTour: "Take a quick tour",

    // Parent / collector
    p1Title: "Everything happens at the gate",
    p1Body:
      "Your child is only released to someone you have authorised — checked by the school, every single time.",
    p2Title: "Tap \"On my way\" when you set off",
    p2Body:
      "The school sees how far away you are, so your child is waiting at the gate instead of you waiting in the car. Location is shared only while that screen is open.",
    p3Title: "Show your code at the gate",
    p3Body:
      "It changes every minute and works without signal, so a screenshot is worth nothing to anyone else.",
    p4Title: "Send someone else, safely",
    p4Body:
      "Add a driver or a relative by phone number, choose which children they may collect, and remove them whenever you like.",

    // Teacher
    t1Title: "Your class, in arrival order",
    t1Body:
      "Children are listed by how close their collector actually is — not by who booked first.",
    t2Title: "Bring them when they are close",
    t2Body:
      "The classroom is told about two minutes before arrival, once. Mark a child at the gate when they set off.",

    // Guard
    g1Title: "Scan the code at the gate",
    g1Body:
      "Point the camera at the collector's phone. Verification happens on this device — it works with no signal at all.",
    g2Title: "Check the face, then confirm",
    g2Body:
      "The screen shows the child and who is collecting them. A valid code is necessary, but you are the last check.",
    g3Title: "If anything fails, use manual",
    g3Body:
      "A dead phone must never stop a real handover. Manual is always available, always logged, and reviewed later.",
  },
  errors: {
    badCredentials: "Incorrect phone number or password.",
    network: "Could not reach the server. Check your connection.",
    wrongAppParent: "This app is for parents and drivers. Staff use the staff app.",
    wrongAppStaff: "This app is for teachers and guards. Parents use the Rukhsat app.",
    wrongAppAdmin: "This dashboard is for administrators.",
    usingSampleData: "Running on sample data — any credentials continue.",
    usingLiveSystem: "Signed in against the live system.",
  },
  status: {
    SCHEDULED: "Scheduled",
    EN_ROUTE: "On the way",
    NEARBY: "Nearby",
    AT_GATE: "At gate",
    HANDED_OVER: "Handed over",
    CANCELLED: "Cancelled",
    LAPSED: "Lapsed",
  },
  role: {
    parent: "Parent",
    teacher: "Teacher",
    guard: "Guard",
    admin: "Admin",
    driver: "Driver",
  },
  queue: {
    title: "Live queue",
    position: "Position",
    collector: "Collector",
    child: "Child",
    eta: "ETA",
    arrivingNow: "Arriving now",
    childrenOnTrip: "children on this trip",
    you: "You",
    noneInQueue: "No one is in the queue right now",
  },
  drivers: {
    title: "Driver registry",
    subtitle:
      "Drivers are vetted and registered by the school. Parents then authorize their own children.",
    registration: "Registration",
    capacity: "Capacity",
    authorizedChildren: "Authorized children",
    addDriver: "Register driver",
  },
  devices: {
    title: "Classroom displays",
    subtitle:
      "A display that goes offline stops announcing silently — there is no other alert.",
    lastSeen: "Last seen",
    pairNew: "Pair a display",
    offlineWarning: "This classroom is not announcing",
    displayOfflineBody:
      "The display is offline — no voice announcement will play in your room. Watch this screen instead.",
  },
  audio: {
    title: "Name recordings",
    subtitle:
      "One clip per person. The same clip is used in both languages — only the surrounding phrases differ.",
    recorded: "Recorded",
    missing: "Not recorded",
    duration: "Duration",
  },
  audit: {
    title: "Audit log",
    flaggedOnly: "Flagged only",
    actor: "Actor",
    action: "Action",
    when: "When",
    flagged: "Flagged for review",
  },
  analytics: {
    title: "Analytics",
    averageWait: "Average wait",
    medianWait: "Median wait",
    onTimeRate: "On-time rate",
    manualRate: "Manual fallback rate",
    waitTrend: "Average wait over time",
    peakMinutes: "Arrivals by minute",
    totalPickups: "Total pickups",
  },
  display: {
    arrivingFor: "arriving for",
    inAboutTwoMinutes: "in about two minutes",
    atGate: "At the gate now",
    waiting: "Waiting for arrivals",
    pairTitle: "Pair this display",
    pairPrompt: "Enter the pairing code from the admin dashboard",
    pairedTo: "Paired to",
  },
  parent: {
    todayTitle: "Today's pickup",
    tabToday: "Today",
    relative: "Relative",
    scheduleNoteTitle: "Note",
    scheduleNoteBody:
      "Queue order on the day comes from live arrival time, not from these booking times. A late arrival simply falls behind — there is no penalty.",
    qrExhausted: "You have used every saved code. Reconnect to get more.",
    privacyTitle: "Privacy",
    privacyBody:
      "Your location is shared only while a trip is active and the app is open. It is never tracked in the background, and raw location history is deleted after 24 hours.",
    tabCode: "Code",
    tabPeople: "People",
    tabProfile: "You",
    heroNoPickup: "Nothing today",
    heroNoPickupCaption: "No pickup is scheduled. Your schedule decides this.",
    heroCollector: "Collected by",
    setupTitle: "Get set up",
    quickSchedule: "Schedule",
    quickTrip: "On my way",
    quickQueue: "Live queue",
    quickException: "Change today",
    quickAnnouncements: "Notices",
    noPickupsToday: "No pickups scheduled today",
    onMyWay: "On my way",
    endTrip: "End trip",
    tripActive: "Trip in progress",
    vanTogetherNote: "Both children travel together on one trip — the van only completes when every child has been handed over.",
    classroomsTold: "The classrooms have been told. Children are being brought to the gate.",
    locationNeeded: "Share your location",
    locationWhy:
      "The school sees how far away you are so your child is ready at the gate. Only while this screen is open — never in the background.",
    allowLocation: "Allow location",
    locationDenied:
      "Location was declined, so the school cannot see your arrival time. Your scheduled pickup still stands — tap above if you change your mind.",
    locationSharing: "Sharing your location",
    locationStopped: "Location sharing stopped",
    startingTrip: "Starting…",
    tripFailed: "Could not start the trip. Check your connection.",
    distanceAway: "away",
    trackingNote: "Location is shared only while this screen is open.",
    showQr: "Show pickup code",
    qrTitle: "Show this at the gate",
    qrRotates: "Refreshes every 60 seconds",
    qrOffline: "Works without signal",
    mySchedule: "Weekly schedule",
    scheduleNote: "Set once. We create each day's pickup automatically.",
    exception: "Change for today",
    absentToday: "Absent today",
    changeTime: "Different time",
    differentCollector: "Someone else is coming",
    myCollectors: "Who can collect my children",
    collectorsNote:
      "You are the account head. Anyone you add here collects only your children.",
    addCollector: "Add someone",
    pickDriver: "School-approved drivers",
    pickDriverNote: "Vetted and registered by the school.",
    addRelative: "A relative or helper",
    addRelativeNote: "You add them directly. They get their own pickup code.",
    whichChildren: "Which children?",
    whoIsCollecting: "Who is collecting?",
    revokeAccess: "Remove access",
    queuePosition: "Your place in the queue",
    youArePosition: "You are number",
    estimatedHandover: "Estimated handover",
    profile: "Profile",
    language: "Language",
    signOut: "Sign out",
    manifest: "Children to collect",
    childrenToCollect: "children across",
    families: "families",
    driverPhone: "Driver's phone number",
    driverPhoneNote: "The number he registered with. Ask him for it.",
    driverNotFound: "No driver registered with that number. Check it with him.",
    relativeName: "Name",
    relativeNamePlaceholder: "Rukhsana Bibi",
    relativeNote: "They sign in with this number and get their own pickup code.",
    standingAccess: "Standing access",
    vettedDriver: "School-registered driver. Vetted before appearing in your list.",
    addedByYou: "Added by you. Not vetted by the school.",
    todayOnlyNote: "Applies to today only. Your weekly schedule is unchanged.",
    oneTimePass: "One-time pass",
    quickActions: "Quick actions",
    myChildren: "My children",
  },
  staff: {
    prepList: "Bring to the gate",
    prepListNote: "From today's bookings. The queue order comes from live ETA.",
    markStaged: "Mark at gate",
    staged: "At gate",
    myClass: "My class",
    offlineVerify: "Offline verify",
    inOtherClasses: "in other classes",
    refused: "Refused",
    scanQr: "Scan pickup code",
    pointAtCode: "Point the camera at the parent's code",
    verified: "Verified",
    denied: "Not valid",
    confirmVisually: "Check the photos, then confirm",
    confirmHandover: "Confirm handover",
    handoverComplete: "Handed over",
    vanHandover: "Van pickup",
    confirmEachChild: "Confirm each child as they board",
    boarded: "Boarded",
    remaining: "remaining",
    manualFallback: "Can't scan?",
    manualTitle: "Manual handover",
    manualNote:
      "Use this whenever scanning is not possible. It is always logged and reviewed — never a workaround.",
    searchChild: "Search child by name",
    whoIsCollecting: "Who is collecting?",
    reason: "Why manual?",
    reasonPhoneDead: "Phone dead",
    reasonNoApp: "No app",
    reasonScanFailed: "Scan failed",
    reasonOther: "Other",
    expired: "Code expired",
    notAuthorized: "Not authorized for this child",
    alreadyUsed: "Code already used",
    offlineQueued: "Saved offline — will sync",
    cameraBlocked: "Camera blocked in Settings — use the code below",
    cameraOff: "Camera off — tap to enable, or use the code below",
    enableCamera: "Enable camera",
    pasteCode: "Paste pickup code",
    scanOfflineNote:
      "Could not reach the server. Use the manual handover below — never turn a family away because the software could not check.",
    tripCompletesNote:
      "The trip only completes when every child has been handed over.",
    oldCodeNote: "Their phone is showing an old code. Ask them to look again.",
    deniedNote:
      "Ask for a fresh code, or complete this handover manually. Never turn a family away because the software said no.",
    classQueueNote: "Your class only, ordered by live arrival time.",
    childNamesPlaceholder: "Ali, Sara, Hamza…",
  },
  landing: {
    navApps: "Get the apps",
    navLogin: "Login",
    navRegister: "Register",
    heroTitle: "Solving Pakistan's montessori school-gate traffic problem.",
    heroSubtitle:
      "A rotating, offline-verified QR code, a driver a parent chose and can revoke, and a manual fallback that never turns a family away.",
    heroCtaPrimary: "Explore the live dashboard",
    heroCtaSecondary: "Get the apps",
    howItWorksTitle: "How a pickup actually works",
    howItWorksSubtitle:
      "Four steps, the same four steps every time — this is the whole product.",
    step1Title: "A parent adds a collector",
    step1Body:
      "By phone number only. No search, no browsable list of children — the search itself would be the leak.",
    step2Title: "The collector taps \"On my way\"",
    step2Body:
      "Live ETA streams to the school. No background tracking — foreground only, on an explicit tap.",
    step3Title: "The classroom hears it, once",
    step3Body:
      "A voice announcement fires at about two minutes out and never repeats for the same trip.",
    step4Title: "The guard scans, offline",
    step4Body:
      "A rotating, signed QR verified against a cached key — no signal required. A manual fallback exists for the day the phone doesn't.",
    problemTitle: "The problem every school gate has",
    problemSubtitle: "None of this is hypothetical — it's the state of pickup at most schools today.",
    problem1Title: "Anyone can say they're picking up a child",
    problem1Body:
      "At most gates, a name and a confident voice is the whole check. There's no record of who a family actually authorised, and no way to verify a stranger on the spot.",
    problem1Solution:
      "A parent grants access by phone number, once. The gate checks a signed, rotating code against exactly that list — nothing else gets a child released.",
    problem2Title: "Parents find out too late, or never",
    problem2Body:
      "If the wrong person collects a child, or the right person is late, a parent usually hears about it secondhand — if at all. There's no record to check.",
    problem2Solution:
      "Every handover is logged with who, when, and how. The parent's phone is told the moment it happens — not asked to trust that it did.",
    problem3Title: "The one day the phone doesn't work",
    problem3Body:
      "A dead battery, no signal, a forgotten app — and a rigid digital system has no answer except turning a real family away at the gate.",
    problem3Solution:
      "Codes verify offline against a cached key. And when even that fails, a manual handover is one tap away — logged and flagged, never blocked.",
    demoTitle: "Try it yourself",
    demoSubtitle:
      "A separate demo school, untouched by anything else running on this system. Log in as the admin below, or use the parent and driver numbers in the mobile apps.",
    demoAdminLabel: "Admin — the dashboard you're about to see",
    demoParentLabel: "Parent — two children, in the app",
    demoDriverLabel: "Driver — collects both, in the app",
    demoPasswordNote: "Password for every demo account:",
    demoLoginCta: "Login as the demo admin",
    demoApplyTitle: "Just exploring?",
    demoApplyBody: "Fill the fields with the demo admin's number and password.",
    demoApplyCta: "Apply demo credentials",
    stackTitle: "Built with",
    stackSubtitle: "No shortcuts on the parts that matter for a child-safety system.",
    originTitle: "Where this comes from",
    originBody:
      "This isn't a hypothetical problem we picked for a competition. Both of us have stood at the gate of a Montessori or primary school in Pakistan — Bahria schools among them — waiting in the same chaotic pickup line every parent and sibling here knows. A guard working from memory, a queue with no order, no way to know if the right person showed up. Rukhsat is the system we wished existed on those afternoons.",
    faqTitle: "Questions worth asking",
    faqSubtitle: "The ones we'd ask, if we were reviewing this.",
    faqQ1: "How does this handle many families and users at once?",
    faqA1:
      "Every school, family and collector is scoped by ID in the database — a driver's dashboard only ever sees the children explicitly authorised to him, never a school-wide list. The live queue is ordered by real-time ETA, not by who logged in first, so it holds up under real dismissal-time load, not just a demo with three accounts.",
    faqQ2: "How does a driver actually pick up a child?",
    faqA2:
      "A driver self-registers but stays invisible to the school and every family until a parent looks him up by phone number and grants access — there is no browsable list of drivers or children, because the search itself would be the privacy leak. Once linked, he taps \"On my way,\" his live ETA streams to the school, and he shows a rotating QR code at the gate that the guard verifies offline.",
    faqQ3: "What about a relative or a one-time pickup?",
    faqA3:
      "The same authorization a driver gets can be granted to anyone — a grandmother, an uncle — directly by the parent, no school involvement needed. For a single day, a parent can issue a one-time pass instead: it expires automatically and burns on first use, so a screenshot forwarded after the fact is worthless.",
    faqQ4: "Can a code be faked or reused?",
    faqA4:
      "Each code is signed with ES256 (elliptic-curve cryptography) and rotates roughly every 60 seconds. The guard's device holds only the public key — enough to verify a signature, useless for forging one — so even a stolen guard tablet can't mint a valid code for any child.",
    faqQ5: "What if the guard's phone has no signal at the gate?",
    faqA5:
      "Verification never depends on a live connection — the guard's app checks the signature against a key it already has, entirely offline. And if a phone dies altogether, a manual handover is built in as a first-class flow: logged, flagged for review, and always available. Software is never the reason a real handover can't happen.",
    faqQ6: "Why doesn't the app track location in the background?",
    faqA6:
      "Location only streams while a collector has the app open and has explicitly tapped \"On my way\" — never in the background, and it stops automatically after 90 minutes or on handover. It's a deliberate constraint, not a missing feature: a school pickup app has no business asking for always-on location.",
    faqQ7: "Who can see a child's personal information?",
    faqA7:
      "Being authorized to collect a child and being allowed to view their record are two different permissions, checked separately every time. A driver's app shows him a name and a photo for gate verification — nothing else about the child or the family is reachable from his account.",
    faqQ8: "Is this actually running, or a mockup?",
    faqA8:
      "Live and deployed — this dashboard, the API behind it, and both mobile apps all run in production, not a local demo. The database, the push notifications, the QR verification are the real thing end to end, not simulated for this page.",
    foundersTitle: "Built by two people",
    founderRole: "Co-Founder",
    supervisorTitle: "Supervised by",
    supervisorRole: "Project Supervisor",
    viewLinkedIn: "View LinkedIn profile",
    footerTagline: "A school pickup queue and verification system.",
    footerNote:
      "Submitted to the Google Play Store; store review is in progress. The APKs below install directly today.",
    getAppsPopupTitle: "See it on a phone",
    getAppsPopupBody:
      "The dashboard is one half of this. Install the parent and staff apps to see the pickup code, the live trip, and the gate scan for yourself.",
    getAppsPopupDismiss: "Not now",
  },
  apps: {
    title: "Get the apps",
    subtitle:
      "Scan with your phone and install directly — no Play Store account needed to try this today.",
    parentAppName: "Rukhsat",
    parentAppTagline: "For parents, relatives and drivers",
    staffAppName: "Rukhsat Staff",
    staffAppTagline: "For teachers and gate guards",
    scanToInstall: "Scan with your phone's camera to install",
    installTitle: "Installing on Android",
    installStep1: "Point your phone's camera at the QR code above and open the link it offers.",
    installStep2:
      "Android will warn about installing from outside the Play Store — tap Settings, then allow this source.",
    installStep3: "Open the downloaded file and tap Install.",
    installStep4: "Open the app and sign in with a demo account from the previous page.",
    playStoreNote:
      "Also submitted to the Google Play Store. Store verification usually takes a few days — the direct APK works right now, on any Android phone.",
    backToDemo: "Back to the demo",
  },
  tour: {
    step1Title: "This is the live queue",
    step1Body:
      "Every child currently being collected, ordered by arrival time — not by who booked first.",
    step2Title: "Students",
    step2Body:
      "The school's roster. A child's guardian CNIC lives here — it's how a parent's self-registration matches to their children.",
    step3Title: "Drivers",
    step3Body:
      "Registered but invisible until a parent links them by phone number. The school vets nobody; liability sits with the parent who grants access.",
    step4Title: "Classroom displays",
    step4Body:
      "Wall-mounted tablets that speak an arrival aloud. A display that goes silent is flagged here — there is no other alert.",
    step5Title: "Audit log",
    step5Body:
      "Every handover, especially manual ones. This is what you'd hand a parent who asks \"who took my child, and when.\"",
    step6Title: "Take this tour again anytime",
    step6Body: "This button reopens it from wherever you are in the dashboard.",
  },
} as const;

export type Strings = typeof en;

/** Deep-readonly mirror of `en`. Missing keys are a compile error. */
type DeepMirror<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepMirror<T[K]>;
};

export const strings = { en } as const;

/** Re-exported from the API types so there is exactly one `Locale` in the package. */
import type { Locale } from "../types/api";
export type { Locale };

/**
 * The apps are English-only as of 21 Aug 2026. The Urdu translation and the
 * `dir()` helper were removed here in the same change.
 *
 * `t()` keeps its signature so no call site had to change, and `Locale` is
 * still re-exported because `User.locale` is a backend field in
 * docs/api/openapi.yaml. The contract is untouched; only what the apps render
 * changed.
 */
export function t(_locale?: Locale): Strings {
  return en;
}
