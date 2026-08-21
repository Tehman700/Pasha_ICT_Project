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

export const ur: DeepMirror<Strings> = {
  common: {
    appName: "رخصت",
    search: "تلاش کریں",
    save: "محفوظ کریں",
    cancel: "منسوخ کریں",
    add: "شامل کریں",
    edit: "ترمیم",
    remove: "ہٹائیں",
    revoke: "منسوخ کریں",
    confirm: "تصدیق کریں",
    back: "واپس",
    loading: "لوڈ ہو رہا ہے…",
    empty: "ابھی کچھ نہیں",
    today: "آج",
    minutes: "منٹ",
    seconds: "سیکنڈ",
    online: "آن لائن",
    offline: "آف لائن",
    all: "تمام",
    of: "میں سے",
  },
  nav: {
    dashboard: "ڈیش بورڈ",
    people: "لوگ",
    schools: "اسکول",
    classes: "کلاسیں",
    students: "طلبہ",
    guardians: "سرپرست",
    staff: "عملہ",
    drivers: "ڈرائیور",
    operations: "آپریشنز",
    queue: "لائیو قطار",
    devices: "کلاس روم ڈسپلے",
    audio: "ناموں کی ریکارڈنگ",
    records: "ریکارڈز",
    audit: "آڈٹ لاگ",
    announcements: "اعلانات",
    analytics: "تجزیات",
  },
  auth: {
    signIn: "سائن ان",
    phone: "فون نمبر",
    password: "پاس ورڈ",
    signInCta: "سائن ان کریں",
    subtitle: "منتظم رسائی",
    phoneFormat: "گیارہ ہندسوں کا موبائل نمبر لکھیں جو 03 سے شروع ہو — مثلاً 03001234567۔",
    parentSubtitle: "والدین، رشتہ دار اور ڈرائیور سب یہاں سائن ان کرتے ہیں۔",
    staffSubtitle: "اساتذہ اور گیٹ گارڈ۔ آپ کا کردار طے کرتا ہے کہ آپ کو کیا نظر آئے گا۔",
    phoneRequired: "اپنا فون نمبر درج کریں۔",
    passwordRequired: "اپنا پاس ورڈ درج کریں۔",
    phoneQuestion: "آپ کا فون نمبر کیا ہے؟",
    phoneHint: "وہی نمبر جو اسکول کے پاس درج ہے۔",
    passwordQuestion: "اپنا پاس ورڈ درج کریں",
  },
  register: {
    noAccount: "اکاؤنٹ نہیں ہے؟",
    createAccount: "اکاؤنٹ بنائیں",
    haveAccount: "پہلے سے اکاؤنٹ ہے؟",
    chooseRole: "آپ کون ہیں؟",
    iAmParent: "میں والد/والدہ ہوں",
    iAmParentHint: "آپ کے بچے پہلے سے اسکول میں داخل ہیں۔",
    iAmDriver: "میں وین چلاتا ہوں",
    iAmDriverHint: "والدین خود آپ کو شامل کریں گے۔ اسکول کا اس میں کوئی کردار نہیں۔",

    fullName: "پورا نام",
    fullNameUr: "اردو میں نام (اختیاری)",
    cnic: "شناختی کارڈ نمبر",
    cnicHint: "13 ہندسے، جیسے کارڈ پر لکھے ہیں",
    confirmPassword: "پاس ورڈ دوبارہ لکھیں",
    school: "اسکول",
    selectSchool: "اپنا اسکول منتخب کریں",
    submit: "اکاؤنٹ بنائیں",
    submitting: "آپ کا اکاؤنٹ بن رہا ہے…",
    nameQuestion: "آپ کا نام کیا ہے؟",
    phoneQuestionHint: "آپ اسی نمبر سے سائن ان کریں گے۔",
    driverPhoneHint: "والدین اسی نمبر سے آپ کو شامل کریں گے، اس لیے یہ درست ہونا چاہیے۔",
    vanQuestion: "اپنی وین کے بارے میں بتائیں",
    photosQuestion: "دو تصاویر، ابھی لی جائیں",
    photosHint:
      "بچہ حوالے کرنے سے پہلے والدین کو آپ کا چہرہ پہچاننا ہوگا۔ صرف کیمرہ — گیلری نہیں۔",
    cnicQuestion: "آپ کا شناختی کارڈ نمبر کیا ہے؟",
    passwordQuestion: "پاس ورڈ منتخب کریں",
    passwordHint: "کم از کم 8 حروف۔",

    parentTitle: "والدین کی رجسٹریشن",
    parentIntro:
      "ہم آپ کے شناختی کارڈ نمبر سے آپ کے بچوں کو تلاش کرتے ہیں — وہی نمبر جو اسکول کے پاس درج ہے۔",
    foundChildren: "ہمیں آپ کے بچے مل گئے",
    foundChildrenBody: "نیچے دیے گئے نام دیکھ لیں، پھر سائن ان کریں۔",
    noMatchTitle: "آپ کا اکاؤنٹ تیار ہے",
    noMatchBody:
      "اس شناختی کارڈ سے ابھی کوئی بچہ نہیں ملا۔ ہو سکتا ہے اسکول کے پاس دوسرے سرپرست کا نمبر درج ہو۔ اسکول کو فون کریں، وہ آپ کا اکاؤنٹ جوڑ دیں گے — آپ ابھی بھی سائن ان کر سکتے ہیں۔",

    driverTitle: "ڈرائیور کی رجسٹریشن",
    driverIntro:
      "ایک بار رجسٹر کریں۔ والدین آپ کو فون نمبر سے تلاش کر کے خود شامل کریں گے۔",
    vehicleNumber: "گاڑی کا رجسٹریشن نمبر",
    vehicleNumberHint: "مثال کے طور پر LEA-1234",
    capacity: "نشستیں",
    expectedArrival: "اسکول پہنچنے کا معمول کا وقت",
    expectedArrivalHint:
      "وہ وقت جب آپ عام طور پر گیٹ پر پہنچتے ہیں۔ اسی سے اسکول کو پتہ چلتا ہے کہ آپ آ رہے ہیں، چاہے کسی دن فون کے سگنل نہ ہوں۔",
    selfie: "آپ کی تصویر",
    selfieHint: "ابھی کیمرے سے لی جائے — والدین آپ کو شامل کرنے سے پہلے یہ دیکھتے ہیں۔",
    idCard: "آپ کا شناختی کارڈ",
    idCardHint: "کارڈ کے سامنے والے رخ کی تصویر لیں، نمبر صاف پڑھا جا سکے۔",
    takePhoto: "تصویر لیں",
    retakePhoto: "دوبارہ لیں",
    photosRequired: "رجسٹریشن سے پہلے دونوں تصاویر ضروری ہیں۔",
    cameraNeeded: "کیمرے کی اجازت",
    cameraNeededBody:
      "دونوں تصاویر ابھی کیمرے سے لینی ہوں گی۔ گیلری سے چنی گئی تصویر کسی کی بھی ہو سکتی ہے۔",
    allowCamera: "کیمرے کی اجازت دیں",
    driverDoneTitle: "آپ رجسٹر ہو گئے ہیں",
    driverDoneBody:
      "ابھی آپ کسی اسکول سے منسلک نہیں ہیں۔ کسی بچے کے آپ کی فہرست میں آنے سے پہلے والدین کا آپ کو شامل کرنا ضروری ہے۔ انہیں وہی فون نمبر دیں جس سے آپ نے رجسٹر کیا ہے۔",

    phoneTaken: "یہ فون نمبر پہلے سے رجسٹرڈ ہے۔ سائن ان کریں۔",
    cnicInvalid: "شناختی کارڈ نمبر 13 ہندسوں کا ہوتا ہے۔",
    passwordShort: "کم از کم 8 حروف استعمال کریں۔",
    passwordMismatch: "دونوں پاس ورڈ ایک جیسے نہیں ہیں۔",
    nameShort: "اپنا پورا نام لکھیں۔",
    vehicleRequired: "گاڑی کا رجسٹریشن نمبر لکھیں۔",
    schoolRequired: "اپنا اسکول منتخب کریں۔",
    failed: "اکاؤنٹ نہیں بن سکا۔ دوبارہ کوشش کریں۔",
  },
  adminSignup: {
    cta: "اپنا اسکول رجسٹر کریں",
    haveAccount: "پہلے سے رجسٹرڈ ہیں؟",
    title: "اپنا اسکول رجسٹر کریں",
    subtitle: "دو مراحل۔ آخر میں آپ سائن ان ہو جائیں گے۔",
    stepOf: "مرحلہ",
    step1Title: "آپ کا منتظم اکاؤنٹ",
    step1Body: "اسی لاگ ان سے آپ اسکول چلائیں گے۔",
    yourName: "آپ کا پورا نام",
    yourNameUr: "اردو میں آپ کا نام (اختیاری)",
    phone: "فون نمبر",
    phoneHint: "آپ اسی سے سائن ان کریں گے۔",
    password: "پاس ورڈ",
    passwordHint: "کم از کم 8 حروف۔",
    confirmPassword: "پاس ورڈ کی تصدیق",
    next: "آگے",
    back: "واپس",
    step2Title: "آپ کا اسکول",
    step2Body:
      "مقام اور دائرہ طے کرتے ہیں کہ نظام کب کہے گا کہ لینے والا قریب پہنچ گیا — اس لیے نشان اسی گیٹ پر لگائیں جو والدین واقعی استعمال کرتے ہیں، کیمپس کے وسط میں نہیں۔",
    schoolName: "اسکول کا نام",
    schoolNamePlaceholder: "بحریہ فاؤنڈیشن اسکول",
    dismissalTime: "چھٹی کا وقت",
    dismissalHint: "جب اسکول کا دن ختم ہوتا ہے۔",
    findLocation: "پتہ تلاش کریں",
    findPlaceholder: "علاقہ، شہر — مثلاً بحریہ ٹاؤن، اسلام آباد",
    search: "تلاش کریں",
    searching: "تلاش جاری ہے…",
    noResults: "اس نام سے کوئی جگہ نہیں ملی۔ نشان خود کھینچ کر رکھیں۔",
    orDropPin: "یا نقشے پر ٹیپ کر کے نشان بالکل درست جگہ رکھیں۔",
    pinnedAt: "نشان یہاں ہے",
    useMyLocation: "میرا موجودہ مقام استعمال کریں",
    radius: "آمد کا دائرہ",
    radiusHint:
      "گیٹ سے کتنی دور لینے والے کو پہنچتا ہوا شمار کیا جائے۔ زیادہ تر اسکولوں کے لیے تقریباً 1 کلومیٹر مناسب ہے۔",
    createAccount: "اسکول اور اکاؤنٹ بنائیں",
    creating: "آپ کا اسکول تیار کیا جا رہا ہے…",
    nameRequired: "اپنا پورا نام لکھیں۔",
    phoneRequired: "فون نمبر لکھیں۔",
    passwordShort: "کم از کم 8 حروف استعمال کریں۔",
    passwordMismatch: "دونوں پاس ورڈ ایک جیسے نہیں ہیں۔",
    schoolNameRequired: "اسکول کا نام لکھیں۔",
    locationRequired: "پہلے اپنے اسکول پر نشان لگائیں۔",
    phoneTaken: "یہ فون نمبر پہلے سے رجسٹرڈ ہے۔ سائن ان کریں۔",
    failed: "آپ کا اسکول نہیں بن سکا۔ دوبارہ کوشش کریں۔",
  },
  onboarding: {
    p1Title: "آپ کا بچہ صحیح شخص کے ساتھ جائے",
    p1Body:
      "صرف وہی لے جا سکتا ہے جسے آپ نے اجازت دی ہو۔ گیٹ ہر بار جانچتا ہے۔",
    p2Title: "اب قطار میں انتظار نہیں",
    p2Body:
      "\"میں آ رہا ہوں\" دبائیں اور آپ کے پہنچنے تک بچہ گیٹ پر موجود ہوگا — بعد میں نہیں۔",
    p3Title: "ایسا کوڈ جو نقل نہیں ہو سکتا",
    p3Body:
      "یہ ہر منٹ بدلتا ہے اور سگنل کے بغیر بھی چلتا ہے، اس لیے اسکرین شاٹ بےکار ہے۔",

    s1Title: "ہر حوالگی، تصدیق شدہ",
    s1Body:
      "گیٹ پر لینے والے کا کوڈ اسکین کریں۔ جانچ اسی آلے پر ہوتی ہے، سگنل ہو یا نہ ہو۔",
    s2Title: "آپ کی کلاس، آمد کی ترتیب میں",
    s2Body:
      "بچے اس ترتیب سے دکھائے جاتے ہیں کہ ان کا لینے والا کتنا قریب ہے — پہلے بکنگ کے حساب سے نہیں۔",
    s3Title: "کسی خاندان کو واپس نہ بھیجیں",
    s3Body:
      "فون بند ہو تو دستی حوالگی ایک دبانے پر ہے۔ یہ محفوظ ہو جاتی ہے اور ہمیشہ کام کرتی ہے۔",
  },
  walkthrough: {
    next: "آگے",
    start: "شروع کریں",
    skip: "چھوڑ دیں",
    replay: "رہنمائی دوبارہ دیکھیں",
    takeTour: "مختصر رہنمائی دیکھیں",

    p1Title: "سب کچھ گیٹ پر ہوتا ہے",
    p1Body:
      "آپ کا بچہ صرف اسی کے حوالے کیا جاتا ہے جسے آپ نے اجازت دی ہو — اسکول ہر بار جانچتا ہے۔",
    p2Title: "روانہ ہوتے وقت \"میں آ رہا ہوں\" دبائیں",
    p2Body:
      "اسکول دیکھتا ہے کہ آپ کتنی دور ہیں، تاکہ بچہ گیٹ پر تیار ہو اور آپ کو گاڑی میں انتظار نہ کرنا پڑے۔ مقام صرف اس وقت شیئر ہوتا ہے جب وہ اسکرین کھلی ہو۔",
    p3Title: "گیٹ پر اپنا کوڈ دکھائیں",
    p3Body:
      "یہ ہر منٹ بدلتا ہے اور بغیر سگنل کے بھی کام کرتا ہے، اس لیے کسی اور کے لیے اسکرین شاٹ بیکار ہے۔",
    p4Title: "کسی اور کو محفوظ طریقے سے بھیجیں",
    p4Body:
      "ڈرائیور یا رشتہ دار کو فون نمبر سے شامل کریں، منتخب کریں کہ وہ کن بچوں کو لے جا سکتے ہیں، اور جب چاہیں ہٹا دیں۔",

    t1Title: "آپ کی جماعت، آمد کی ترتیب میں",
    t1Body:
      "بچے اس ترتیب میں ہیں کہ ان کا لینے والا اصل میں کتنا قریب ہے — نہ کہ کس نے پہلے بکنگ کی۔",
    t2Title: "قریب پہنچنے پر انہیں لائیں",
    t2Body:
      "کلاس روم کو آمد سے تقریباً دو منٹ پہلے، ایک بار بتایا جاتا ہے۔ بچہ روانہ ہو تو اسے گیٹ پر نشان زد کریں۔",

    g1Title: "گیٹ پر کوڈ اسکین کریں",
    g1Body:
      "کیمرہ لینے والے کے فون کی طرف کریں۔ تصدیق اسی آلے پر ہوتی ہے — بغیر سگنل کے بھی کام کرتی ہے۔",
    g2Title: "چہرہ دیکھیں، پھر تصدیق کریں",
    g2Body:
      "اسکرین بچہ اور لینے والا دکھاتی ہے۔ درست کوڈ ضروری ہے، لیکن آخری جانچ آپ ہیں۔",
    g3Title: "کچھ کام نہ کرے تو دستی استعمال کریں",
    g3Body:
      "بند فون کبھی اصل حوالگی نہ روکے۔ دستی طریقہ ہمیشہ دستیاب، ہمیشہ محفوظ، اور بعد میں جانچا جاتا ہے۔",
  },
  errors: {
    badCredentials: "فون نمبر یا پاس ورڈ درست نہیں ہے۔",
    network: "سرور سے رابطہ نہیں ہو سکا۔ اپنا انٹرنیٹ کنکشن دیکھیں۔",
    wrongAppParent: "یہ ایپ والدین اور ڈرائیوروں کے لیے ہے۔ عملہ اسٹاف ایپ استعمال کرے۔",
    wrongAppStaff: "یہ ایپ اساتذہ اور گارڈز کے لیے ہے۔ والدین رخصت ایپ استعمال کریں۔",
    wrongAppAdmin: "یہ ڈیش بورڈ منتظمین کے لیے ہے۔",
    usingSampleData: "نمونہ ڈیٹا پر چل رہا ہے — کوئی بھی تفصیلات کام کریں گی۔",
    usingLiveSystem: "لائیو سسٹم سے سائن ان ہیں۔",
  },
  status: {
    SCHEDULED: "طے شدہ",
    EN_ROUTE: "راستے میں",
    NEARBY: "قریب",
    AT_GATE: "گیٹ پر",
    HANDED_OVER: "حوالے کر دیا",
    CANCELLED: "منسوخ",
    LAPSED: "وقت گزر گیا",
  },
  role: {
    parent: "والدین",
    teacher: "استاد",
    guard: "گارڈ",
    admin: "منتظم",
    driver: "ڈرائیور",
  },
  queue: {
    title: "لائیو قطار",
    position: "نمبر",
    collector: "لینے والا",
    child: "بچہ",
    eta: "متوقع وقت",
    arrivingNow: "ابھی پہنچ رہے ہیں",
    childrenOnTrip: "بچے اس سفر میں",
    you: "آپ",
    noneInQueue: "اس وقت قطار میں کوئی نہیں",
  },
  drivers: {
    title: "ڈرائیور رجسٹری",
    subtitle:
      "ڈرائیوروں کی جانچ اور رجسٹریشن اسکول کرتا ہے۔ اس کے بعد والدین اپنے بچوں کی اجازت دیتے ہیں۔",
    registration: "رجسٹریشن نمبر",
    capacity: "گنجائش",
    authorizedChildren: "اجازت یافتہ بچے",
    addDriver: "ڈرائیور رجسٹر کریں",
  },
  devices: {
    title: "کلاس روم ڈسپلے",
    subtitle:
      "آف لائن ہونے والا ڈسپلے خاموشی سے اعلان کرنا بند کر دیتا ہے — اس کے علاوہ کوئی اطلاع نہیں ملتی۔",
    lastSeen: "آخری بار دیکھا گیا",
    pairNew: "نیا ڈسپلے جوڑیں",
    offlineWarning: "یہ کلاس روم اعلان نہیں کر رہا",
    displayOfflineBody:
      "ڈسپلے آف لائن ہے — آپ کے کمرے میں کوئی آواز نہیں چلے گی۔ اس کے بجائے یہ اسکرین دیکھتے رہیں۔",
  },
  audio: {
    title: "ناموں کی ریکارڈنگ",
    subtitle:
      "ہر فرد کے لیے ایک کلپ۔ یہی کلپ دونوں زبانوں میں استعمال ہوتی ہے — صرف ساتھ کے جملے بدلتے ہیں۔",
    recorded: "ریکارڈ شدہ",
    missing: "ریکارڈ نہیں",
    duration: "دورانیہ",
  },
  audit: {
    title: "آڈٹ لاگ",
    flaggedOnly: "صرف نشان زد",
    actor: "کارکن",
    action: "عمل",
    when: "وقت",
    flagged: "جائزے کے لیے نشان زد",
  },
  analytics: {
    title: "تجزیات",
    averageWait: "اوسط انتظار",
    medianWait: "درمیانی انتظار",
    onTimeRate: "وقت پر شرح",
    manualRate: "دستی متبادل شرح",
    waitTrend: "وقت کے ساتھ اوسط انتظار",
    peakMinutes: "فی منٹ آمد",
    totalPickups: "کل پک اپ",
  },
  display: {
    arrivingFor: "لینے آ رہے ہیں",
    inAboutTwoMinutes: "تقریباً دو منٹ میں",
    atGate: "ابھی گیٹ پر",
    waiting: "آمد کا انتظار",
    pairTitle: "یہ ڈسپلے جوڑیں",
    pairPrompt: "ایڈمن ڈیش بورڈ سے پیئرنگ کوڈ درج کریں",
    pairedTo: "منسلک ہے",
  },
  parent: {
    todayTitle: "آج کی پک اپ",
    tabToday: "آج",
    relative: "رشتہ دار",
    scheduleNoteTitle: "نوٹ",
    scheduleNoteBody:
      "اُس دن قطار کی ترتیب اصل آمد کے وقت سے طے ہوتی ہے، ان بکنگ اوقات سے نہیں۔ دیر سے آنے پر صرف باری پیچھے ہو جاتی ہے — کوئی جرمانہ نہیں۔",
    qrExhausted: "محفوظ شدہ تمام کوڈ استعمال ہو چکے ہیں۔ مزید حاصل کرنے کے لیے دوبارہ رابطہ کریں۔",
    privacyTitle: "رازداری",
    privacyBody:
      "آپ کا مقام صرف اُس وقت شیئر ہوتا ہے جب سفر جاری ہو اور ایپ کھلی ہو۔ بیک گراونڈ میں کبھی ٹریک نہیں ہوتا، اور مقام کی تفصیل 24 گھنٹے بعد حذف کر دی جاتی ہے۔",
    tabCode: "کوڈ",
    tabPeople: "لوگ",
    tabProfile: "آپ",
    heroNoPickup: "آج کچھ نہیں",
    heroNoPickupCaption: "کوئی پک اپ طے نہیں۔ یہ آپ کے شیڈول سے طے ہوتا ہے۔",
    heroCollector: "لے جانے والا",
    setupTitle: "سیٹ اپ مکمل کریں",
    quickSchedule: "شیڈول",
    quickTrip: "میں آ رہا ہوں",
    quickQueue: "لائیو قطار",
    quickException: "آج تبدیل کریں",
    quickAnnouncements: "اطلاعات",
    noPickupsToday: "آج کوئی پک اپ طے نہیں",
    onMyWay: "میں آ رہا ہوں",
    endTrip: "سفر ختم کریں",
    tripActive: "سفر جاری ہے",
    vanTogetherNote: "دونوں بچے ایک ہی سفر میں جاتے ہیں — وین تب مکمل ہوگی جب ہر بچہ حوالے کر دیا جائے۔",
    classroomsTold: "کلاس رومز کو بتا دیا گیا ہے۔ بچوں کو گیٹ پر لایا جا رہا ہے۔",
    locationNeeded: "اپنا مقام شیئر کریں",
    locationWhy:
      "اسکول دیکھتا ہے کہ آپ کتنی دور ہیں تاکہ آپ کا بچہ گیٹ پر تیار ہو۔ صرف اس وقت جب یہ اسکرین کھلی ہو — کبھی بیک گراونڈ میں نہیں۔",
    allowLocation: "مقام کی اجازت دیں",
    locationDenied:
      "مقام کی اجازت نہیں دی گئی، اس لیے اسکول آپ کی آمد کا وقت نہیں دیکھ سکتا۔ آپ کا طے شدہ پک اپ برقرار ہے — ارادہ بدلے تو اوپر دبائیں۔",
    locationSharing: "آپ کا مقام شیئر ہو رہا ہے",
    locationStopped: "مقام شیئر کرنا بند",
    startingTrip: "شروع ہو رہا ہے…",
    tripFailed: "سفر شروع نہیں ہو سکا۔ اپنا کنکشن دیکھیں۔",
    distanceAway: "دور",
    trackingNote: "لوکیشن صرف اس اسکرین کے کھلے رہنے تک شیئر ہوتی ہے۔",
    showQr: "پک اپ کوڈ دکھائیں",
    qrTitle: "یہ گیٹ پر دکھائیں",
    qrRotates: "ہر ۶۰ سیکنڈ بعد تبدیل ہوتا ہے",
    qrOffline: "سگنل کے بغیر بھی کام کرتا ہے",
    mySchedule: "ہفتہ وار شیڈول",
    scheduleNote: "ایک بار سیٹ کریں۔ ہر دن کی پک اپ خودکار بن جائے گی۔",
    exception: "آج کے لیے تبدیلی",
    absentToday: "آج غیر حاضر",
    changeTime: "مختلف وقت",
    differentCollector: "کوئی اور آ رہا ہے",
    myCollectors: "میرے بچوں کو کون لے جا سکتا ہے",
    collectorsNote:
      "اکاؤنٹ آپ کے پاس ہے۔ یہاں شامل کیا گیا شخص صرف آپ کے بچوں کو لے جا سکتا ہے۔",
    addCollector: "کسی کو شامل کریں",
    pickDriver: "اسکول سے منظور شدہ ڈرائیور",
    pickDriverNote: "اسکول نے جانچ کر کے رجسٹر کیا ہے۔",
    addRelative: "رشتہ دار یا مددگار",
    addRelativeNote: "آپ خود شامل کریں۔ انہیں اپنا پک اپ کوڈ ملے گا۔",
    whichChildren: "کون سے بچے؟",
    whoIsCollecting: "کون لے جا رہا ہے؟",
    revokeAccess: "رسائی ہٹائیں",
    queuePosition: "قطار میں آپ کا نمبر",
    youArePosition: "آپ کا نمبر ہے",
    estimatedHandover: "متوقع وقت",
    profile: "پروفائل",
    language: "زبان",
    signOut: "سائن آؤٹ",
    manifest: "لے جانے والے بچے",
    childrenToCollect: "بچے",
    families: "خاندانوں سے",
    driverPhone: "ڈرائیور کا فون نمبر",
    driverPhoneNote: "وہی نمبر جس سے اس نے رجسٹر کیا۔ اس سے پوچھ لیں۔",
    driverNotFound: "اس نمبر سے کوئی ڈرائیور رجسٹرڈ نہیں۔ اس سے تصدیق کریں۔",
    relativeName: "نام",
    relativeNamePlaceholder: "رخسانہ بی بی",
    relativeNote: "وہ اسی نمبر سے سائن ان کریں گے اور اپنا الگ پک اپ کوڈ ملے گا۔",
    standingAccess: "مستقل اجازت",
    vettedDriver: "اسکول میں رجسٹرڈ ڈرائیور۔ آپ کی فہرست میں آنے سے پہلے جانچا گیا۔",
    addedByYou: "آپ نے شامل کیا۔ اسکول نے جانچ نہیں کی۔",
    todayOnlyNote: "صرف آج کے لیے۔ آپ کا ہفتہ وار شیڈول وہی رہے گا۔",
    oneTimePass: "ایک بار کا پاس",
    quickActions: "فوری کام",
    myChildren: "میرے بچے",
  },
  staff: {
    prepList: "گیٹ پر لائیں",
    prepListNote: "آج کی بکنگ سے۔ قطار کی ترتیب لائیو وقت سے بنتی ہے۔",
    markStaged: "گیٹ پر نشان لگائیں",
    staged: "گیٹ پر",
    myClass: "میری کلاس",
    offlineVerify: "آف لائن تصدیق",
    inOtherClasses: "دیگر کلاسوں میں",
    refused: "انکار",
    scanQr: "پک اپ کوڈ اسکین کریں",
    pointAtCode: "کیمرہ والدین کے کوڈ پر رکھیں",
    verified: "تصدیق ہو گئی",
    denied: "درست نہیں",
    confirmVisually: "تصاویر دیکھ کر تصدیق کریں",
    confirmHandover: "حوالگی کی تصدیق کریں",
    handoverComplete: "حوالے کر دیا",
    vanHandover: "وین پک اپ",
    confirmEachChild: "ہر بچے کی سوار ہوتے وقت تصدیق کریں",
    boarded: "سوار ہو گیا",
    remaining: "باقی",
    manualFallback: "اسکین نہیں ہو رہا؟",
    manualTitle: "دستی حوالگی",
    manualNote:
      "جب بھی اسکین ممکن نہ ہو یہ استعمال کریں۔ یہ ہمیشہ ریکارڈ اور جائزہ ہوتا ہے — کوئی خلاف ورزی نہیں۔",
    searchChild: "بچے کا نام تلاش کریں",
    whoIsCollecting: "کون لے جا رہا ہے؟",
    reason: "دستی کیوں؟",
    reasonPhoneDead: "فون بند",
    reasonNoApp: "ایپ نہیں",
    reasonScanFailed: "اسکین ناکام",
    reasonOther: "دیگر",
    expired: "کوڈ کی میعاد ختم",
    notAuthorized: "اس بچے کے لیے اجازت نہیں",
    alreadyUsed: "کوڈ پہلے استعمال ہو چکا",
    offlineQueued: "آف لائن محفوظ — بعد میں سنک ہو گا",
    cameraBlocked: "کیمرہ سیٹنگز میں بند ہے — نیچے کوڈ لکھیں",
    cameraOff: "کیمرہ بند ہے — آن کریں، یا نیچے کوڈ لکھیں",
    enableCamera: "کیمرہ آن کریں",
    pasteCode: "پک اپ کوڈ یہاں لکھیں",
    scanOfflineNote:
      "سرور سے رابطہ نہیں ہو سکا۔ نیچے دستی حوالگی استعمال کریں — سافٹ ویئر کی وجہ سے کسی خاندان کو کبھی واپس نہ بھیجیں۔",
    tripCompletesNote: "سفر تب مکمل ہوگا جب ہر بچہ حوالے کر دیا جائے۔",
    oldCodeNote: "ان کے فون پر پرانا کوڈ ہے۔ دوبارہ دیکھنے کو کہیں۔",
    deniedNote:
      "نیا کوڈ مانگیں، یا یہ حوالگی دستی مکمل کریں۔ سافٹ ویئر کے انکار پر کسی خاندان کو واپس نہ بھیجیں۔",
    classQueueNote: "صرف آپ کی جماعت، آمد کے وقت کے مطابق ترتیب میں۔",
    childNamesPlaceholder: "علی، سارہ، حمزہ…",
  },
  landing: {
    navApps: "ایپس حاصل کریں",
    navLogin: "لاگ ان",
    navRegister: "رجسٹر",
    heroTitle: "پاکستان کے مونٹیسری اسکولوں کے گیٹ پر ٹریفک کے مسئلے کا حل۔",
    heroSubtitle:
      "ایک گھومتا، آف لائن تصدیق شدہ QR کوڈ، ایک ڈرائیور جسے والدین نے چنا اور واپس لے سکتے ہیں، اور ایک دستی طریقہ جو کبھی کسی خاندان کو واپس نہیں بھیجتا۔",
    heroCtaPrimary: "لائیو ڈیش بورڈ دیکھیں",
    heroCtaSecondary: "ایپس حاصل کریں",
    howItWorksTitle: "پک اپ اصل میں کیسے کام کرتا ہے",
    howItWorksSubtitle: "چار مراحل، ہر بار وہی چار مراحل — یہی پورا نظام ہے۔",
    step1Title: "والدین کوئی لینے والا شامل کرتے ہیں",
    step1Body:
      "صرف فون نمبر سے۔ نہ کوئی تلاش، نہ بچوں کی فہرست — تلاش خود ہی رساو ہوتی۔",
    step2Title: "لینے والا \"میں آ رہا ہوں\" دباتا ہے",
    step2Body:
      "لائیو اندازہ وقت اسکول تک پہنچتا ہے۔ کوئی بیک گراونڈ ٹریکنگ نہیں — صرف اسکرین کھلی ہونے پر۔",
    step3Title: "کلاس روم ایک بار سنتا ہے",
    step3Body:
      "تقریباً دو منٹ کی دوری پر ایک آواز کا اعلان ہوتا ہے اور اسی سفر کے لیے دوبارہ نہیں دہرایا جاتا۔",
    step4Title: "گارڈ آف لائن اسکین کرتا ہے",
    step4Body:
      "ایک گھومتا، دستخط شدہ QR کوڈ جو محفوظ شدہ کلید سے تصدیق ہوتا ہے — سگنل کی ضرورت نہیں۔ اس دن کے لیے ایک دستی طریقہ بھی موجود ہے جب فون کام نہ کرے۔",
    problemTitle: "ہر اسکول گیٹ کا مسئلہ",
    problemSubtitle: "یہ کوئی فرضی بات نہیں — آج زیادہ تر اسکولوں میں پک اپ کی یہی حالت ہے۔",
    problem1Title: "کوئی بھی کہہ سکتا ہے کہ وہ بچہ لینے آیا ہے",
    problem1Body:
      "زیادہ تر گیٹس پر صرف نام اور پراعتماد لہجہ ہی پوری جانچ ہے۔ کوئی ریکارڈ نہیں کہ خاندان نے اصل میں کسے اجازت دی، اور اجنبی کی موقع پر تصدیق کا کوئی طریقہ نہیں۔",
    problem1Solution:
      "والدین ایک بار فون نمبر سے رسائی دیتے ہیں۔ گیٹ ایک دستخط شدہ، گھومتے کوڈ کو بالکل اسی فہرست کے خلاف جانچتا ہے — کچھ اور بچہ حوالے نہیں کر سکتا۔",
    problem2Title: "والدین کو دیر سے پتا چلتا ہے، یا کبھی نہیں",
    problem2Body:
      "اگر غلط شخص بچہ لے جائے، یا صحیح شخص دیر سے آئے، والدین کو عام طور پر بعد میں پتا چلتا ہے — اگر پتا چلے تو۔ جانچنے کے لیے کوئی ریکارڈ نہیں۔",
    problem2Solution:
      "ہر حوالگی کس نے، کب اور کیسے کے ساتھ محفوظ ہوتی ہے۔ والدین کے فون کو اسی لمحے بتایا جاتا ہے — یہ امید نہیں کی جاتی کہ وہ بھروسہ کریں۔",
    problem3Title: "وہ دن جب فون کام نہ کرے",
    problem3Body:
      "بیٹری ختم، سگنل نہیں، ایپ بھول جانا — اور ایک سخت ڈیجیٹل نظام کے پاس اصلی خاندان کو گیٹ سے واپس بھیجنے کے سوا کوئی جواب نہیں۔",
    problem3Solution:
      "کوڈز محفوظ شدہ کلید کے خلاف آف لائن تصدیق ہوتے ہیں۔ اور جب یہ بھی ناکام ہو، دستی حوالگی ایک ٹیپ کی دوری پر ہے — محفوظ اور نشان زد، کبھی روکی نہیں جاتی۔",
    demoTitle: "خود آزمائیں",
    demoSubtitle:
      "ایک الگ نمائشی اسکول، جو اس نظام میں چل رہی کسی اور چیز کو متاثر نہیں کرتا۔ نیچے دیے گئے ایڈمن سے لاگ ان کریں، یا موبائل ایپس میں والدین اور ڈرائیور کے نمبر استعمال کریں۔",
    demoAdminLabel: "ایڈمن — جو ڈیش بورڈ آپ دیکھنے والے ہیں",
    demoParentLabel: "والدین — ایپ میں دو بچے",
    demoDriverLabel: "ڈرائیور — ایپ میں دونوں کو لے جاتا ہے",
    demoPasswordNote: "ہر نمائشی اکاؤنٹ کا پاس ورڈ:",
    demoLoginCta: "نمائشی ایڈمن کے طور پر لاگ ان کریں",
    demoApplyTitle: "صرف دیکھنا چاہتے ہیں؟",
    demoApplyBody: "خانوں میں نمائشی ایڈمن کا نمبر اور پاس ورڈ بھر دیں۔",
    demoApplyCta: "نمائشی معلومات بھریں",
    stackTitle: "جن اوزاروں سے بنایا گیا",
    stackSubtitle: "بچوں کی حفاظت کے نظام کے اہم حصوں میں کوئی سمجھوتہ نہیں۔",
    originTitle: "یہ خیال کہاں سے آیا",
    originBody:
      "یہ کوئی فرضی مسئلہ نہیں جو ہم نے مقابلے کے لیے چنا۔ ہم دونوں پاکستان میں کسی مونٹیسری یا پرائمری اسکول کے گیٹ پر کھڑے ہو چکے ہیں — بحریہ اسکولز سمیت — اسی افراتفری بھری پک اپ لائن میں انتظار کرتے ہوئے جسے یہاں ہر والدین اور بہن بھائی جانتا ہے۔ ایک گارڈ جو یاد داشت پر کام کر رہا ہو، بغیر ترتیب کی قطار، یہ جاننے کا کوئی طریقہ نہیں کہ صحیح شخص آیا یا نہیں۔ رخصت وہی نظام ہے جو ہم ان دوپہروں میں چاہتے تھے۔",
    faqTitle: "پوچھنے کے قابل سوالات",
    faqSubtitle: "وہی سوالات جو ہم خود پوچھتے، اگر ہم اس کا جائزہ لے رہے ہوتے۔",
    faqQ1: "یہ بیک وقت کئی خاندانوں اور صارفین کو کیسے سنبھالتا ہے؟",
    faqA1:
      "ہر اسکول، خاندان اور لینے والا ڈیٹا بیس میں ID سے محدود ہے — ڈرائیور کا ڈیش بورڈ صرف انہی بچوں کو دکھاتا ہے جن کی واضح اجازت اسے دی گئی ہو، کبھی پورے اسکول کی فہرست نہیں۔ لائیو قطار اصل وقت کے اندازے سے ترتیب پاتی ہے، نہ کہ کون پہلے لاگ ان ہوا — اس لیے یہ اصل رخصتی وقت کے دباؤ میں بھی چلتی ہے، صرف تین اکاؤنٹس والے نمائشی ورژن میں نہیں۔",
    faqQ2: "ڈرائیور دراصل بچے کو کیسے لیتا ہے؟",
    faqA2:
      "ڈرائیور خود رجسٹر کرتا ہے لیکن اسکول اور ہر خاندان کے لیے اس وقت تک پوشیدہ رہتا ہے جب تک کوئی والدین اسے فون نمبر سے تلاش کر کے اجازت نہ دیں — ڈرائیوروں یا بچوں کی کوئی قابل تلاش فہرست نہیں، کیونکہ تلاش خود ہی رازداری کا رساو ہوتی۔ جڑنے کے بعد وہ \"میں آ رہا ہوں\" دباتا ہے، اس کا لائیو اندازہ وقت اسکول تک پہنچتا ہے، اور وہ گیٹ پر ایک گھومتا QR کوڈ دکھاتا ہے جسے گارڈ آف لائن تصدیق کرتا ہے۔",
    faqQ3: "کسی رشتہ دار یا ایک بار کی پک اپ کا کیا طریقہ ہے؟",
    faqA3:
      "جو اجازت ڈرائیور کو ملتی ہے وہی کسی کو بھی دی جا سکتی ہے — دادی، چچا — براہ راست والدین کی طرف سے، اسکول کی شمولیت کے بغیر۔ ایک دن کے لیے، والدین ایک بار کا پاس جاری کر سکتے ہیں: یہ خود بخود ختم ہو جاتا ہے اور پہلے استعمال پر جل جاتا ہے، اس لیے بعد میں بھیجی گئی اسکرین شاٹ بیکار ہوتی ہے۔",
    faqQ4: "کیا کوئی کوڈ جعلی بنایا یا دوبارہ استعمال ہو سکتا ہے؟",
    faqA4:
      "ہر کوڈ ES256 (elliptic-curve cryptography) سے دستخط شدہ ہے اور تقریباً ہر 60 سیکنڈ میں بدلتا ہے۔ گارڈ کے آلے کے پاس صرف عوامی کلید ہے — دستخط جانچنے کے لیے کافی، جعلی بنانے کے لیے بیکار — اس لیے چوری شدہ گارڈ ٹیبلٹ بھی کسی بچے کے لیے درست کوڈ نہیں بنا سکتا۔",
    faqQ5: "اگر گیٹ پر گارڈ کے فون میں سگنل نہ ہو تو؟",
    faqA5:
      "تصدیق کبھی بھی لائیو کنکشن پر منحصر نہیں — گارڈ کی ایپ دستخط کو اپنی موجودہ کلید کے خلاف مکمل آف لائن جانچتی ہے۔ اور اگر فون بالکل بند ہو جائے، دستی حوالگی ایک بنیادی طریقہ ہے: محفوظ، جائزے کے لیے نشان زد، اور ہمیشہ دستیاب۔ سافٹ ویئر کبھی وجہ نہیں بنتا کہ اصل حوالگی نہ ہو سکے۔",
    faqQ6: "ایپ بیک گراونڈ میں مقام کیوں نہیں ٹریک کرتی؟",
    faqA6:
      "مقام صرف اس وقت بھیجا جاتا ہے جب لینے والے کی ایپ کھلی ہو اور اس نے واضح طور پر \"میں آ رہا ہوں\" دبایا ہو — کبھی بیک گراونڈ میں نہیں، اور 90 منٹ بعد یا حوالگی پر خود بخود بند ہو جاتا ہے۔ یہ جان بوجھ کر رکھی گئی حد ہے، کوئی کمی نہیں: اسکول پک اپ ایپ کو ہمیشہ آن رہنے والے مقام کی ضرورت نہیں۔",
    faqQ7: "بچے کی ذاتی معلومات کون دیکھ سکتا ہے؟",
    faqA7:
      "بچے کو لینے کی اجازت ہونا اور اس کا ریکارڈ دیکھنے کی اجازت ہونا دو الگ اجازتیں ہیں، ہر بار الگ سے جانچی جاتی ہیں۔ ڈرائیور کی ایپ اسے گیٹ کی تصدیق کے لیے صرف نام اور تصویر دکھاتی ہے — بچے یا خاندان کے بارے میں کچھ اور اس کے اکاؤنٹ سے قابل رسائی نہیں۔",
    faqQ8: "کیا یہ واقعی چل رہا ہے، یا صرف نمونہ ہے؟",
    faqA8:
      "لائیو اور تعینات — یہ ڈیش بورڈ، اس کے پیچھے کا API، اور دونوں موبائل ایپس سب پروڈکشن میں چلتے ہیں، مقامی نمائش نہیں۔ ڈیٹا بیس، پش نوٹیفیکیشنز، QR تصدیق سب اصلی ہیں، اس صفحے کے لیے نقل نہیں۔",
    foundersTitle: "دو افراد نے بنایا",
    founderRole: "شریک بانی",
    supervisorTitle: "زیرِ نگرانی",
    supervisorRole: "پروجیکٹ سپروائزر",
    viewLinkedIn: "لنکڈ اِن پروفائل دیکھیں",
    footerTagline: "اسکول پک اپ قطار اور تصدیقی نظام۔",
    footerNote:
      "گوگل پلے اسٹور پر جمع کرایا گیا؛ اسٹور کا جائزہ جاری ہے۔ نیچے دی گئی APKs آج ہی براہ راست انسٹال ہوتی ہیں۔",
    getAppsPopupTitle: "اسے فون پر دیکھیں",
    getAppsPopupBody:
      "ڈیش بورڈ اس کا آدھا حصہ ہے۔ پک اپ کوڈ، لائیو ٹرپ، اور گیٹ پر اسکین خود دیکھنے کے لیے پیرنٹ اور اسٹاف ایپس انسٹال کریں۔",
    getAppsPopupDismiss: "ابھی نہیں",
  },
  apps: {
    title: "ایپس حاصل کریں",
    subtitle: "براہ راست انسٹال کریں — آج آزمانے کے لیے پلے اسٹور اکاؤنٹ درکار نہیں۔",
    parentAppName: "رخصت",
    parentAppTagline: "والدین، رشتہ داروں اور ڈرائیوروں کے لیے",
    staffAppName: "رخصت اسٹاف",
    staffAppTagline: "اساتذہ اور گیٹ گارڈز کے لیے",
    scanToInstall: "انسٹال کرنے کے لیے اپنے فون کے کیمرے سے اسکین کریں",
    installTitle: "اینڈرائیڈ پر انسٹال کرنا",
    installStep1: "اپنے فون کا کیمرہ اوپر دیے گئے QR کوڈ پر رکھیں اور جو لنک آئے اسے کھولیں۔",
    installStep2:
      "اینڈرائیڈ پلے اسٹور سے باہر انسٹال کرنے پر خبردار کرے گا — سیٹنگز پر جائیں اور اس ذریعے کی اجازت دیں۔",
    installStep3: "ڈاؤن لوڈ شدہ فائل کھولیں اور انسٹال دبائیں۔",
    installStep4: "ایپ کھولیں اور پچھلے صفحے سے کسی نمائشی اکاؤنٹ سے سائن ان کریں۔",
    playStoreNote:
      "گوگل پلے اسٹور پر بھی جمع کرایا گیا۔ اسٹور کی تصدیق میں عام طور پر چند دن لگتے ہیں — براہ راست APK ابھی، کسی بھی اینڈرائیڈ فون پر کام کرتی ہے۔",
    backToDemo: "نمائش پر واپس جائیں",
  },
  tour: {
    step1Title: "یہ لائیو قطار ہے",
    step1Body:
      "ہر وہ بچہ جسے فی الحال لیا جا رہا ہے، آمد کے وقت کے مطابق ترتیب میں — نہ کہ کس نے پہلے بکنگ کی۔",
    step2Title: "طلبہ",
    step2Body:
      "اسکول کی فہرست۔ بچے کے سرپرست کا شناختی کارڈ نمبر یہاں ہے — اسی سے والدین کی خود رجسٹریشن ان کے بچوں سے ملتی ہے۔",
    step3Title: "ڈرائیورز",
    step3Body:
      "رجسٹرڈ لیکن اس وقت تک پوشیدہ جب تک کوئی والدین انہیں فون نمبر سے نہ جوڑیں۔ اسکول کسی کی جانچ نہیں کرتا؛ ذمہ داری اس والدین پر ہے جس نے اجازت دی۔",
    step4Title: "کلاس روم ڈسپلے",
    step4Body:
      "دیوار پر لگے ٹیبلٹ جو آمد کا اعلان بولتے ہیں۔ خاموش ڈسپلے یہاں نشان زد ہوتا ہے — کوئی اور انتباہ نہیں۔",
    step5Title: "آڈٹ لاگ",
    step5Body:
      "ہر حوالگی، خاص طور پر دستی۔ یہی وہ چیز ہے جو آپ اس والدین کو دکھائیں گے جو پوچھے \"میرا بچہ کس نے، کب لیا۔\"",
    step6Title: "یہ ٹور دوبارہ کبھی بھی دیکھیں",
    step6Body: "یہ بٹن آپ ڈیش بورڈ میں جہاں بھی ہوں، اسے دوبارہ کھول دیتا ہے۔",
  },
};

export const strings = { en, ur } as const;

/** Re-exported from the API types so there is exactly one `Locale` in the package. */
import type { Locale } from "../types/api";
export type { Locale };

/**
 * The Urdu translation lives here for `apps/admin-web`, which is still
 * bilingual. The React Native apps went English-only on 21 Aug 2026 and simply
 * never ask for it — their provider pins the locale to "en" and has no toggle,
 * so `ur` is unreachable from an app rather than deleted out from under the
 * dashboard.
 */
export function t(locale: Locale): Strings {
  return (locale === "ur" ? ur : en) as Strings;
}

/** Urdu is right-to-left. Every layout primitive must honour this. */
export function dir(locale: Locale): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}
