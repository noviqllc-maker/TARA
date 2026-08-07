// src/data/svadhyaya.ts
// Svādhyāya — "Teaching of the Day" content. Two kinds:
//   • SHLOKAS: Bhagavad Gītā verses (public domain). Only verses reproducible with high
//     confidence in BOTH Devanāgarī and citation are included — anything uncertain is
//     offered as a CONCEPT instead, never an approximated quotation. The `rendering` is a
//     faithful PLAIN-ENGLISH rendering (framed as a rendering, not a translation-of-record).
//   • CONCEPTS: jyotiṣa-literacy cards in a warm teacher's voice — no doom.
// Each entry carries a `graha` affinity used to relate it to the day's vāra lord.

export type Teaching = {
  id: string;
  type: 'shloka' | 'concept';
  graha: string;
  // shloka fields
  citation?: string;      // "Gītā 2.47"
  devanagari?: string;    // two lines, separated by \n
  iast?: string;          // IAST transliteration, two lines
  rendering?: string;     // plain-English rendering (framed as rendering in the UI)
  // concept fields
  title?: string;
  body?: string;          // 2–4 sentences
  // both
  forToday: string;       // a short "for today" unpacking
};

// ---- SHLOKAS (Bhagavad Gītā, public domain) -----------------------------------
export const SHLOKAS: Teaching[] = [
  {
    id: 'gita-2-47', type: 'shloka', graha: 'Saturn', citation: 'Gītā 2.47',
    devanagari: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥',
    iast: 'karmaṇy evādhikāras te mā phaleṣu kadācana |\nmā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi ||',
    rendering: 'A rendering: your right is to the action itself, never to its fruits. Do not act for the fruit, and do not be attached to inaction either.',
    forToday: 'Give yourself fully to the doing, and hold the outcome lightly. The effort is yours; the result belongs to a larger order.',
  },
  {
    id: 'gita-2-48', type: 'shloka', graha: 'Moon', citation: 'Gītā 2.48',
    devanagari: 'योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥',
    iast: 'yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya |\nsiddhy-asiddhyoḥ samo bhūtvā samatvaṁ yoga ucyate ||',
    rendering: 'A rendering: steady in yoga, do your work and let go of clinging. Even in success and failure, stay even. That evenness of mind is called yoga.',
    forToday: 'Meet the day’s wins and losses with the same steady heart. Equanimity is not indifference. It is a wider kind of strength.',
  },
  {
    id: 'gita-2-14', type: 'shloka', graha: 'Saturn', citation: 'Gītā 2.14',
    devanagari: 'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः।\nआगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत॥',
    iast: 'mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ |\nāgamāpāyino ’nityās tāṁs titikṣasva bhārata ||',
    rendering: 'A rendering: contact with the world brings cold and heat, pleasure and pain. They come and go and do not last, so learn to endure them with patience.',
    forToday: 'Whatever today brings is weather, not climate. It will pass. Let it move through you without deciding who you are.',
  },
  {
    id: 'gita-2-20', type: 'shloka', graha: 'Ketu', citation: 'Gītā 2.20',
    devanagari: 'न जायते म्रियते वा कदाचिन्नायं भूत्वा भविता वा न भूयः।\nअजो नित्यः शाश्वतोऽयं पुराणो न हन्यते हन्यमाने शरीरे॥',
    iast: 'na jāyate mriyate vā kadācin nāyaṁ bhūtvā bhavitā vā na bhūyaḥ |\najo nityaḥ śāśvato ’yaṁ purāṇo na hanyate hanyamāne śarīre ||',
    rendering: 'A rendering: the Self is never born and never dies; it did not come to be and will not cease. Unborn, eternal, ancient, it is not slain when the body is slain.',
    forToday: 'Something in you is steadier than any single day. Rest a moment in the part of you that nothing can touch.',
  },
  {
    id: 'gita-2-13', type: 'shloka', graha: 'Ketu', citation: 'Gītā 2.13',
    devanagari: 'देहिनोऽस्मिन्यथा देहे कौमारं यौवनं जरा।\nतथा देहान्तरप्राप्तिर्धीरस्तत्र न मुह्यति॥',
    iast: 'dehino ’smin yathā dehe kaumāraṁ yauvanaṁ jarā |\ntathā dehāntara-prāptir dhīras tatra na muhyati ||',
    rendering: 'A rendering: just as the embodied one passes through childhood, youth, and age within this body, so it passes to another body. The steady are not confused by this.',
    forToday: 'You have already outlived many versions of yourself. Change is not loss. It is how life keeps moving you forward.',
  },
  {
    id: 'gita-2-40', type: 'shloka', graha: 'Mars', citation: 'Gītā 2.40',
    devanagari: 'नेहाभिक्रमनाशोऽस्ति प्रत्यवायो न विद्यते।\nस्वल्पमप्यस्य धर्मस्य त्रायते महतो भयात्॥',
    iast: 'nehābhikrama-nāśo ’sti pratyavāyo na vidyate |\nsv-alpam apy asya dharmasya trāyate mahato bhayāt ||',
    rendering: 'A rendering: on this path no effort is wasted and no step is lost. Even a little of this practice protects one from great fear.',
    forToday: 'The small effort you make today is never wasted. Begin. Even a little counts, and it keeps you steady.',
  },
  {
    id: 'gita-2-50', type: 'shloka', graha: 'Mercury', citation: 'Gītā 2.50',
    devanagari: 'बुद्धियुक्तो जहातीह उभे सुकृतदुष्कृते।\nतस्माद्योगाय युज्यस्व योगः कर्मसु कौशलम्॥',
    iast: 'buddhi-yukto jahātīha ubhe sukṛta-duṣkṛte |\ntasmād yogāya yujyasva yogaḥ karmasu kauśalam ||',
    rendering: 'A rendering: one joined to a balanced mind sets aside both good and bad deeds here. So devote yourself to yoga. Yoga is skill in action.',
    forToday: 'Do the ordinary thing with full, unhurried attention. Skill is not speed; it is care poured into what’s in front of you.',
  },
  {
    id: 'gita-2-63', type: 'shloka', graha: 'Mars', citation: 'Gītā 2.63',
    devanagari: 'क्रोधाद्भवति संमोहः संमोहात्स्मृतिविभ्रमः।\nस्मृतिभ्रंशाद् बुद्धिनाशो बुद्धिनाशात्प्रणश्यति॥',
    iast: 'krodhād bhavati saṁmohaḥ saṁmohāt smṛti-vibhramaḥ |\nsmṛti-bhraṁśād buddhi-nāśo buddhi-nāśāt praṇaśyati ||',
    rendering: 'A rendering: from anger comes confusion; from confusion, a wandering memory; from lost memory, the loss of clear judgment, and then one is undone.',
    forToday: 'When anger rises, pause before it clouds your sight. One steady breath can keep the whole chain from starting.',
  },
  {
    id: 'gita-2-70', type: 'shloka', graha: 'Ketu', citation: 'Gītā 2.70',
    devanagari: 'आपूर्यमाणमचलप्रतिष्ठं समुद्रमापः प्रविशन्ति यद्वत्।\nतद्वत्कामा यं प्रविशन्ति सर्वे स शान्तिमाप्नोति न कामकामी॥',
    iast: 'āpūryamāṇam acala-pratiṣṭhaṁ samudram āpaḥ praviśanti yadvat |\ntadvat kāmā yaṁ praviśanti sarve sa śāntim āpnoti na kāma-kāmī ||',
    rendering: 'A rendering: as rivers pour into the sea, yet it stays full and unmoved, so desires enter the peaceful one, who finds peace, unlike the one who chases desire.',
    forToday: 'Let wants arrive and pass without pulling you off-centre. Peace comes from being the sea, not from catching every river.',
  },
  {
    id: 'gita-2-71', type: 'shloka', graha: 'Ketu', citation: 'Gītā 2.71',
    devanagari: 'विहाय कामान्यः सर्वान्पुमांश्चरति निःस्पृहः।\nनिर्ममो निरहङ्कारः स शान्तिमधिगच्छति॥',
    iast: 'vihāya kāmān yaḥ sarvān pumāṁś carati niḥspṛhaḥ |\nnirmamo nirahaṅkāraḥ sa śāntim adhigacchati ||',
    rendering: 'A rendering: the one who moves through life having let go of craving, free of “mine” and of ego, reaches peace.',
    forToday: 'Loosen your grip on one “I must have this” today. Notice how much lighter the day feels when you do.',
  },
  {
    id: 'gita-3-19', type: 'shloka', graha: 'Saturn', citation: 'Gītā 3.19',
    devanagari: 'तस्मादसक्तः सततं कार्यं कर्म समाचर।\nअसक्तो ह्याचरन्कर्म परमाप्नोति पूरुषः॥',
    iast: 'tasmād asaktaḥ satataṁ kāryaṁ karma samācara |\nasakto hy ācaran karma param āpnoti pūruṣaḥ ||',
    rendering: 'A rendering: therefore, always do the work that should be done without attachment, for by acting without attachment, one reaches the highest.',
    forToday: 'Do what’s yours to do, then let it go. Duty done freely, without clinging, quietly lifts you.',
  },
  {
    id: 'gita-3-21', type: 'shloka', graha: 'Sun', citation: 'Gītā 3.21',
    devanagari: 'यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः।\nस यत्प्रमाणं कुरुते लोकस्तदनुवर्तते॥',
    iast: 'yad yad ācarati śreṣṭhas tat tad evetaro janaḥ |\nsa yat pramāṇaṁ kurute lokas tad anuvartate ||',
    rendering: 'A rendering: whatever a great person does, others follow; whatever standard they set, the world takes as its measure.',
    forToday: 'Someone is watching how you carry yourself today. Lead, quietly, by the example you would want to see.',
  },
  {
    id: 'gita-3-35', type: 'shloka', graha: 'Sun', citation: 'Gītā 3.35',
    devanagari: 'श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।\nस्वधर्मे निधनं श्रेयः परधर्मो भयावहः॥',
    iast: 'śreyān sva-dharmo viguṇaḥ para-dharmāt sv-anuṣṭhitāt |\nsva-dharme nidhanaṁ śreyaḥ para-dharmo bhayāvahaḥ ||',
    rendering: 'A rendering: better one’s own dharma, even imperfectly done, than another’s dharma done well. It is better to live and even fall in your own path.',
    forToday: 'Your own honest path, however uneven, suits you better than a borrowed one. Measure yourself by your road, not someone else’s.',
  },
  {
    id: 'gita-3-42', type: 'shloka', graha: 'Mercury', citation: 'Gītā 3.42',
    devanagari: 'इन्द्रियाणि पराण्याहुरिन्द्रियेभ्यः परं मनः।\nमनसस्तु परा बुद्धिर्यो बुद्धेः परतस्तु सः॥',
    iast: 'indriyāṇi parāṇy āhur indriyebhyaḥ paraṁ manaḥ |\nmanasas tu parā buddhir yo buddheḥ paratas tu saḥ ||',
    rendering: 'A rendering: the senses are said to be higher than the body, the mind higher than the senses, the intellect higher than the mind, and higher still is the Self.',
    forToday: 'When the senses pull, remember there is a quieter intelligence above them. Let the deeper part of you have the last word.',
  },
  {
    id: 'gita-4-7', type: 'shloka', graha: 'Jupiter', citation: 'Gītā 4.7',
    devanagari: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥',
    iast: 'yadā yadā hi dharmasya glānir bhavati bhārata |\nabhyutthānam adharmasya tadātmānaṁ sṛjāmy aham ||',
    rendering: 'A rendering: whenever dharma weakens and disorder rises, says Kṛṣṇa, I bring myself forth.',
    forToday: 'When things tilt off-balance, help arrives, sometimes through you. Be a small place where things get set right again.',
  },
  {
    id: 'gita-4-8', type: 'shloka', graha: 'Jupiter', citation: 'Gītā 4.8',
    devanagari: 'परित्राणाय साधूनां विनाशाय च दुष्कृताम्।\nधर्मसंस्थापनार्थाय सम्भवामि युगे युगे॥',
    iast: 'paritrāṇāya sādhūnāṁ vināśāya ca duṣkṛtām |\ndharma-saṁsthāpanārthāya sambhavāmi yuge yuge ||',
    rendering: 'A rendering: to protect the good, to dissolve what harms, and to re-establish dharma, I come age after age.',
    forToday: 'Goodness is never finally outnumbered; it keeps returning. Add your small weight to its side today.',
  },
  {
    id: 'gita-4-38', type: 'shloka', graha: 'Jupiter', citation: 'Gītā 4.38',
    devanagari: 'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते।\nतत्स्वयं योगसंसिद्धः कालेनात्मनि विन्दति॥',
    iast: 'na hi jñānena sadṛśaṁ pavitram iha vidyate |\ntat svayaṁ yoga-saṁsiddhaḥ kālenātmani vindati ||',
    rendering: 'A rendering: nothing here purifies like knowledge. In time, one perfected in yoga finds it within themselves.',
    forToday: 'Understanding clears the heart the way light clears a room. Learn one true thing today, and let it settle in.',
  },
  {
    id: 'gita-4-39', type: 'shloka', graha: 'Jupiter', citation: 'Gītā 4.39',
    devanagari: 'श्रद्धावाँल्लभते ज्ञानं तत्परः संयतेन्द्रियः।\nज्ञानं लब्ध्वा परां शान्तिमचिरेणाधिगच्छति॥',
    iast: 'śraddhāvāṁl labhate jñānaṁ tat-paraḥ saṁyatendriyaḥ |\njñānaṁ labdhvā parāṁ śāntim acireṇādhigacchati ||',
    rendering: 'A rendering: the one with faith, intent and self-possessed, gains knowledge, and having gained it, soon reaches the highest peace.',
    forToday: 'Trust the process enough to stay with it. Faith plus steady attention is how understanding, and calm, arrive.',
  },
  {
    id: 'gita-5-10', type: 'shloka', graha: 'Venus', citation: 'Gītā 5.10',
    devanagari: 'ब्रह्मण्याधाय कर्माणि सङ्गं त्यक्त्वा करोति यः।\nलिप्यते न स पापेन पद्मपत्रमिवाम्भसा॥',
    iast: 'brahmaṇy ādhāya karmāṇi saṅgaṁ tyaktvā karoti yaḥ |\nlipyate na sa pāpena padma-patram ivāmbhasā ||',
    rendering: 'A rendering: one who offers actions to the Absolute and acts without attachment is untouched by wrong, like a lotus leaf by water.',
    forToday: 'Be in the day fully, yet let it roll off you like water off a leaf. Engaged and unstained is a beautiful way to live.',
  },
  {
    id: 'gita-6-5', type: 'shloka', graha: 'Sun', citation: 'Gītā 6.5',
    devanagari: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥',
    iast: 'uddhared ātmanātmānaṁ nātmānam avasādayet |\nātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ ||',
    rendering: 'A rendering: lift yourself by yourself; do not let yourself sink. For you alone are your own friend, and you alone your own adversary.',
    forToday: 'Be a friend to yourself today, the encouraging kind. The voice you use inwardly shapes the whole day.',
  },
  {
    id: 'gita-6-17', type: 'shloka', graha: 'Moon', citation: 'Gītā 6.17',
    devanagari: 'युक्ताहारविहारस्य युक्तचेष्टस्य कर्मसु।\nयुक्तस्वप्नावबोधस्य योगो भवति दुःखहा॥',
    iast: 'yuktāhāra-vihārasya yukta-ceṣṭasya karmasu |\nyukta-svapnāvabodhasya yogo bhavati duḥkha-hā ||',
    rendering: 'A rendering: for one balanced in food and rest, in effort and in sleep and waking, yoga becomes the ender of sorrow.',
    forToday: 'Balance in the small rhythms of eating, resting, and working is itself a practice. Tend the ordinary and the day steadies.',
  },
  {
    id: 'gita-6-19', type: 'shloka', graha: 'Saturn', citation: 'Gītā 6.19',
    devanagari: 'यथा दीपो निवातस्थो नेङ्गते सोपमा स्मृता।\nयोगिनो यतचित्तस्य युञ्जतो योगमात्मनः॥',
    iast: 'yathā dīpo nivāta-stho neṅgate sopamā smṛtā |\nyogino yata-cittasya yuñjato yogam ātmanaḥ ||',
    rendering: 'A rendering: “as a lamp in a windless place does not flicker.” That is the image given for the collected mind of one steady in yoga.',
    forToday: 'Find one windless place in your day and let the mind go still. A flame kept from the wind burns clear.',
  },
  {
    id: 'gita-6-35', type: 'shloka', graha: 'Moon', citation: 'Gītā 6.35',
    devanagari: 'असंशयं महाबाहो मनो दुर्निग्रहं चलम्।\nअभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते॥',
    iast: 'asaṁśayaṁ mahā-bāho mano durnigrahaṁ calam |\nabhyāsena tu kaunteya vairāgyeṇa ca gṛhyate ||',
    rendering: 'A rendering: no doubt the mind is restless and hard to hold, but by practice and by non-attachment it is gathered in.',
    forToday: 'A wandering mind is normal, not a failure. Gently, patiently, keep bringing it back. That returning is the practice.',
  },
  {
    id: 'gita-9-22', type: 'shloka', graha: 'Jupiter', citation: 'Gītā 9.22',
    devanagari: 'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।\nतेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम्॥',
    iast: 'ananyāś cintayanto māṁ ye janāḥ paryupāsate |\nteṣāṁ nityābhiyuktānāṁ yoga-kṣemaṁ vahāmy aham ||',
    rendering: 'A rendering: for those who hold to the Divine with undivided heart, I carry what they lack and keep what they have.',
    forToday: 'You are more held than you feel on a busy day. Do your part wholeheartedly and trust that you are looked after.',
  },
  {
    id: 'gita-16-21', type: 'shloka', graha: 'Rahu', citation: 'Gītā 16.21',
    devanagari: 'त्रिविधं नरकस्येदं द्वारं नाशनमात्मनः।\nकामः क्रोधस्तथा लोभस्तस्मादेतत्त्रयं त्यजेत्॥',
    iast: 'tri-vidhaṁ narakasyedaṁ dvāraṁ nāśanam ātmanaḥ |\nkāmaḥ krodhas tathā lobhas tasmād etat trayaṁ tyajet ||',
    rendering: 'A rendering: three gates lead to one’s own undoing: craving, anger, and greed. Therefore, it is wise to release these three.',
    forToday: 'Notice which of the three is loudest today, and simply set it down. Naming a craving already loosens its hold.',
  },
  {
    id: 'gita-18-66', type: 'shloka', graha: 'Ketu', citation: 'Gītā 18.66',
    devanagari: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।\nअहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥',
    iast: 'sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja |\nahaṁ tvā sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ ||',
    rendering: 'A rendering: letting go of all else, take refuge in the Divine alone. Do not grieve. You will be freed.',
    forToday: 'When you’ve done all you can, you’re allowed to hand the rest over. Surrender is not defeat; it is deep rest.',
  },
];

// ---- CONCEPTS (jyotiṣa literacy — warm teacher's voice, no doom) ---------------
export const CONCEPTS: Teaching[] = [
  {
    id: 'concept-nakshatra', type: 'concept', graha: 'Moon', title: 'What is a nakshatra?',
    body: 'The zodiac is divided not only into 12 signs but into 27 nakshatras, “lunar mansions” of about 13°20′ each. The Moon spends roughly a day in each, and the nakshatra it sits in colours the emotional texture of that day. Each has its own symbol, ruling graha, and personality, which is why two people born under the same Sun sign can still feel quite different.',
    forToday: 'Your Moon’s nakshatra is a fingerprint the Sun sign can’t see. It’s the finer grain of who you are.',
  },
  {
    id: 'concept-lagna', type: 'concept', graha: 'Sun', title: 'What is your lagna?',
    body: 'The lagna, or ascendant, is the sign rising on the eastern horizon at the moment you were born. It anchors the whole chart. It becomes your first house and sets where every other house falls. In Vedic astrology the lagna often matters more than the Sun sign for describing your body, temperament, and the lens through which you meet life.',
    forToday: 'Your lagna is the doorway you step through into the world. It’s the “you” before anyone asks your sign.',
  },
  {
    id: 'concept-dasha', type: 'concept', graha: 'Saturn', title: 'What is a dasha?',
    body: 'A dasha is a planetary period, a stretch of years ruled by one graha, during which its themes come to the foreground of your life. Vedic astrology reads your life as a sequence of these chapters rather than one fixed personality. Knowing which dasha is running is less about prediction and more about understanding the season you’re in.',
    forToday: 'You’re always inside a chapter, and chapters change. Ask what this one is trying to teach you.',
  },
  {
    id: 'concept-vimshottari', type: 'concept', graha: 'Saturn', title: 'The Vimśottari cycle',
    body: 'The most-used dasha system, Vimśottari, spans 120 years and gives each of the nine grahas a fixed number of them: Venus 20, Saturn 19, Jupiter 16, and so on. Which graha you begin life under is set by your Moon’s nakshatra at birth. The long periods nest into shorter sub-periods, so life reads like chapters within chapters.',
    forToday: 'Your life has a rhythm written from your very first breath. Timing, in jyotiṣa, is everything.',
  },
  {
    id: 'concept-sidereal', type: 'concept', graha: 'Mercury', title: 'Sidereal vs tropical',
    body: 'Western astrology is usually tropical. It ties the zodiac to the seasons and the equinox. Vedic astrology is sidereal. It ties the zodiac to the actual stars behind the planets. Because the two slowly drift apart (about 24° now), your Vedic Sun sign is often the one “before” your Western one. Neither is wrong; they’re simply measuring from different anchors.',
    forToday: 'Two maps of the same sky, drawn from different landmarks. Sidereal keeps its eyes on the stars themselves.',
  },
  {
    id: 'concept-ayanamsa', type: 'concept', graha: 'Mercury', title: 'What is the ayanāṁśa?',
    body: 'The ayanāṁśa is the exact angle between the tropical and sidereal zodiacs, the gap the two systems have drifted apart. Most Vedic astrologers use the Lahiri (Citrapakṣa) value. It’s the single number that converts a Western position into a Vedic one, which is why picking one matters for accuracy.',
    forToday: 'A small correction angle, quietly doing important work. Precision is its own kind of respect.',
  },
  {
    id: 'concept-why-moon', type: 'concept', graha: 'Moon', title: 'Why the Moon matters most',
    body: 'In Vedic astrology the Moon, not the Sun, is often read first. It governs the mind (manas), the emotions, and your moment-to-moment inner weather, and it moves fast, touching a new nakshatra each day. Your birth Moon sign (rāśi) is what a Vedic astrologer usually asks for first, and daily timing leans heavily on where the Moon is now.',
    forToday: 'The Sun is who you are; the Moon is how you feel. Jyotiṣa listens closely to the feeling.',
  },
  {
    id: 'concept-graha-sun', type: 'concept', graha: 'Sun', title: 'The Sun (Sūrya)',
    body: 'The Sun is the soul of the chart: your core self, vitality, confidence, and sense of purpose. It rules the sign Leo and is exalted in Aries. Where the Sun sits shows where you’re meant to shine and take honest ownership. Strong or challenged, its lesson is the same: stand in your own light without needing to outshine anyone.',
    forToday: 'The Sun asks you to be genuinely yourself, in the open. Dignity, not display.',
  },
  {
    id: 'concept-graha-moon', type: 'concept', graha: 'Moon', title: 'The Moon (Chandra)',
    body: 'The Moon is the mind and heart: emotions, memory, nourishment, and your need for belonging. It rules Cancer and is exalted in Taurus. A well-tended Moon brings calm and care; a restless one asks for rest and reassurance. More than any other graha, it colours how a day actually feels.',
    forToday: 'Tend the Moon by tending your inner weather. Rest and care are not detours. They’re the work.',
  },
  {
    id: 'concept-graha-mars', type: 'concept', graha: 'Mars', title: 'Mars (Maṅgala)',
    body: 'Mars is drive, courage, and the energy to act and protect. It rules Aries and Scorpio and is exalted in Capricorn. Well-directed, it gives discipline, stamina, and the nerve to begin; scattered, it can run hot. Its gift is learning to aim your fire rather than spend it.',
    forToday: 'Mars is a good servant and a poor master. Point the energy, and let it work for you.',
  },
  {
    id: 'concept-graha-mercury', type: 'concept', graha: 'Mercury', title: 'Mercury (Budha)',
    body: 'Mercury is intelligence, speech, learning, and exchange: the quick, connective mind. It rules Gemini and Virgo and is exalted in Virgo. It loves language, commerce, and clever problem-solving. Its practice is turning scattered thoughts into clear words and honest plans.',
    forToday: 'Mercury rewards the clear word over the clever one. Say the true thing simply.',
  },
  {
    id: 'concept-graha-jupiter', type: 'concept', graha: 'Jupiter', title: 'Jupiter (Guru / Bṛhaspati)',
    body: 'Jupiter is the great benefic: wisdom, growth, faith, and grace. It rules Sagittarius and Pisces and is exalted in Cancer. It expands whatever it touches, brings teachers and opportunities, and inclines you toward meaning and generosity. Its one caution: don’t mistake comfort for the finish line.',
    forToday: 'Jupiter opens doors for the generous and the curious. Think a little bigger today.',
  },
  {
    id: 'concept-graha-venus', type: 'concept', graha: 'Venus', title: 'Venus (Śukra)',
    body: 'Venus is love, beauty, art, and pleasure, the grace that makes life sweet. It rules Taurus and Libra and is exalted in Pisces. It governs relationships, comfort, creativity, and refinement. Its wisdom is to value what, and who, truly matters, rather than chasing mere comfort or approval.',
    forToday: 'Venus asks you to make one small thing beautiful today. Connection over correction.',
  },
  {
    id: 'concept-graha-saturn', type: 'concept', graha: 'Saturn', title: 'Why does Saturn teach?',
    body: 'Saturn (Śani) is the great teacher: discipline, patience, time, and lasting structure. It rules Capricorn and Aquarius and is exalted in Libra. Its lessons come slowly and ask real effort, which is why it’s misread as harsh; in truth it rewards honesty, responsibility, and the unglamorous work that endures. What Saturn gives, no one can take away.',
    forToday: 'Saturn isn’t punishing you. It’s building you. Trust the long game over the quick win.',
  },
  {
    id: 'concept-graha-rahu', type: 'concept', graha: 'Rahu', title: 'Rahu, the north node',
    body: 'Rahu is not a planet but the Moon’s north node, a sensitive point, not a body. It represents hunger, ambition, and the pull toward the new, the foreign, and the unconventional. It magnifies whatever it touches and points to what you came to explore this life. Its practice is to reach boldly while staying grounded, so appetite doesn’t become the whole story.',
    forToday: 'Rahu shows where you’re learning something new. Reach for it, with your feet on the earth.',
  },
  {
    id: 'concept-graha-ketu', type: 'concept', graha: 'Ketu', title: 'Ketu, the south node',
    body: 'Ketu is the Moon’s south node, Rahu’s opposite point. It represents what you already carry deeply: old mastery, detachment, and the pull inward toward meaning. Where Ketu sits, life gently loosens outer things so something subtler can form. Its gift is depth, simplicity, and the freedom of letting go.',
    forToday: 'Ketu asks less reaching, more releasing. What are you ready to set down?',
  },
  {
    id: 'concept-nodes', type: 'concept', graha: 'Rahu', title: 'The lunar nodes (Rāhu–Ketu)',
    body: 'Rahu and Ketu are the two points where the Moon’s path crosses the Sun’s, the places eclipses happen. They’re always exactly opposite each other and always move backward through the zodiac. Though not physical bodies, they’re treated as powerful shadow-influences: Rahu the outward hunger, Ketu the inward release. Together they form the karmic axis of the chart.',
    forToday: 'The nodes are an axis, not two loose points. One reaches out, the other lets go, and you live between them.',
  },
  {
    id: 'concept-tithi', type: 'concept', graha: 'Moon', title: 'What is a tithi?',
    body: 'A tithi is a lunar day, the time it takes the Moon to gain 12° on the Sun, so there are 30 in a lunar month. They split into the waxing fortnight (Śukla Pakṣa) and the waning fortnight (Kṛṣṇa Pakṣa). Tithis carry their own moods and are used to time festivals, vows, and auspicious beginnings.',
    forToday: 'The Moon keeps a calendar of its own. Today has a lunar name as well as a solar one.',
  },
  {
    id: 'concept-panchanga', type: 'concept', graha: 'Moon', title: 'What is the panchāṅga?',
    body: 'The panchāṅga (“five limbs”) is the traditional Vedic almanac of the day, woven from five threads: tithi (lunar day), vāra (weekday), nakṣatra (Moon’s mansion), yoga (a Sun–Moon angle), and karaṇa (half-tithi). Read together they describe the day’s quality. It’s the everyday tool behind auspicious timing.',
    forToday: 'Every day has a texture you can read. The panchāṅga is how tradition takes the day’s pulse.',
  },
  {
    id: 'concept-yoga-panchanga', type: 'concept', graha: 'Sun', title: 'Yoga (in the panchāṅga)',
    body: 'One of the five limbs of the panchāṅga is called yoga. Here it means a specific angle between the Sun and Moon, of which there are 27. (This is different from a planetary “yoga,” which is a combination in the birth chart.) Each panchāṅga yoga lends the day a subtle flavour, some gentle and some more energetic.',
    forToday: 'The same word, two meanings: a daily Sun–Moon angle, and a chart combination. Context tells you which.',
  },
  {
    id: 'concept-karana', type: 'concept', graha: 'Moon', title: 'What is a karaṇa?',
    body: 'A karaṇa is half of a tithi, so two karaṇas make one lunar day, and there are eleven that repeat through the month. Like tithis, they carry moods traditionally used to fine-tune the timing of tasks. They’re the smallest of the panchāṅga’s five limbs.',
    forToday: 'Tradition measures the day down to its halves. Fine timing is an old art.',
  },
  {
    id: 'concept-houses', type: 'concept', graha: 'Jupiter', title: 'The twelve houses (bhāvas)',
    body: 'The chart is divided into twelve houses, each a domain of life: the first is self and body, the seventh partnership, the tenth career, and so on. Grahas placed in a house energise that area of life; the house a graha rules links two areas together. Reading a chart is largely reading which life-areas are lit up and how.',
    forToday: 'Every part of your life has a room in the chart. The houses are the floor plan of a life.',
  },
  {
    id: 'concept-navamsa', type: 'concept', graha: 'Venus', title: 'What is the navāṁśa (D9)?',
    body: 'The navāṁśa is a “divisional chart”: each sign is split into nine parts and mapped to a second, finer chart. It’s especially prized for reading marriage, partnership, and a graha’s deeper strength. A planet that looks weak in the main chart but strong in the navāṁśa is quietly better than it first appears.',
    forToday: 'The D9 is the chart behind the chart, a second look that often tells the truer story.',
  },
  {
    id: 'concept-drishti', type: 'concept', graha: 'Mars', title: 'What is dṛṣṭi (aspect)?',
    body: 'Dṛṣṭi is a graha’s “gaze”: its influence cast across the chart to other houses and planets. Every graha aspects the seventh house from itself, and some (Mars, Jupiter, Saturn) have special extra aspects. Where a graha looks, it lends its quality, so a planet can shape a part of life it doesn’t even sit in.',
    forToday: 'Influence travels by line of sight in a chart. A graha touches more than the room it stands in.',
  },
  {
    id: 'concept-exaltation', type: 'concept', graha: 'Sun', title: 'Exaltation & debilitation',
    body: 'Each graha has a sign where it feels most at home and expressive (exaltation) and the opposite sign where it works against the grain (debilitation). The Sun is exalted in Aries, for instance. These aren’t “good” and “bad” so much as easy and effortful. A debilitated graha often develops real depth precisely because it has to work harder.',
    forToday: 'Even a graha out of its comfort zone can grow strong. Effort has its own dignity.',
  },
  {
    id: 'concept-kendra-trikona', type: 'concept', graha: 'Jupiter', title: 'Kendras & trikoṇas',
    body: 'Two families of houses carry special weight. The kendras (1, 4, 7, 10) are the “angles”: houses of action and structure. The trikoṇas (1, 5, 9) are the “trines”: houses of grace, wisdom, and fortune. Grahas placed here, and connections between them, are among the chart’s brightest strengths.',
    forToday: 'Some rooms of the chart carry extra light. The angles build; the trines bless.',
  },
  {
    id: 'concept-retrograde', type: 'concept', graha: 'Mercury', title: 'Retrogrades in jyotiṣa',
    body: 'A retrograde graha appears to move backward from Earth’s view. It isn’t really reversing, but its energy turns inward and reflective. In jyotiṣa a retrograde planet is often considered unusually strong, not weak: it asks you to revisit, refine, and go deeper rather than rush ahead. Mercury retrograde, the famous one, simply favours re-reading and re-thinking.',
    forToday: 'Retrograde isn’t a warning light. It’s an invitation to go back over things with care.',
  },
  {
    id: 'concept-sade-sati', type: 'concept', graha: 'Saturn', title: 'What is Sade Sati?',
    body: 'Sade Sati is the roughly seven-and-a-half-year passage when Saturn transits the sign before, on, and after your Moon. Its reputation is fearsome, but it’s better understood as a long, maturing season, one that asks for patience and simplicity and tends to build foundations that last. Many people look back on it as the making of them.',
    forToday: 'Saturn’s long seasons ripen you slowly. What’s built under patience tends to stay built.',
  },
  {
    id: 'concept-muhurta', type: 'concept', graha: 'Jupiter', title: 'What is muhūrta?',
    body: 'Muhūrta is the art of choosing an auspicious moment to begin something important: a marriage, a journey, a new venture. It reads the panchāṅga and the planets to find a window when the sky supports the aim. It reflects a gentle idea: that beginning in harmony with the moment gives a plan a kinder start.',
    forToday: 'Beginnings carry the weather of their moment. When you can, start with the wind at your back.',
  },
  {
    id: 'concept-vara', type: 'concept', graha: 'Sun', title: 'The vāra (weekday lord)',
    body: 'Each weekday is ruled by a graha: Sunday by the Sun, Monday the Moon, Tuesday Mars, Wednesday Mercury, Thursday Jupiter, Friday Venus, Saturday Saturn. The day carries that graha’s flavour, which is why some tasks feel more natural on some days. It’s the simplest, oldest layer of Vedic timing, and it’s hiding in the names of the days themselves.',
    forToday: 'Today already has a ruling planet. Working with its grain is the easiest timing there is.',
  },
  {
    id: 'concept-mantra', type: 'concept', graha: 'Jupiter', title: 'What is a mantra?',
    body: 'A mantra is a sound or phrase repeated to steady and focus the mind, literally “that which protects the mind.” Some are simple graha salutations, some are longer invocations. The power is less in magic than in attention: repeating one gathers a scattered mind into a single, quiet thread.',
    forToday: 'A mantra is a handrail for the mind. Repetition is the practice, not the performance.',
  },
  {
    id: 'concept-japa', type: 'concept', graha: 'Moon', title: 'What is japa?',
    body: 'Japa is the repetition of a mantra, often counted on a mālā of 108 beads. The number 108 recurs across Indian tradition and gives the practice a natural beginning, middle, and end. It’s meditation you can hold in your hands, each bead a small return of attention.',
    forToday: 'One bead, one breath, one return. Japa turns attention into something you can feel.',
  },
  {
    id: 'concept-dharma', type: 'concept', graha: 'Jupiter', title: 'What is dharma?',
    body: 'Dharma is one of the deep words of the tradition. It means something like your right way of being: your duty, your nature, and the path that is truly yours. It isn’t a fixed rulebook but a living sense of what is yours to do. Much of jyotiṣa is really an inquiry into your dharma and its timing.',
    forToday: 'Dharma is the road that fits your feet. The quiet question is always: what is mine to do?',
  },
  {
    id: 'concept-timing-not-fate', type: 'concept', graha: 'Saturn', title: 'Timing, not fate',
    body: 'Vedic astrology reads the chart as a map of tendencies and timing, not a sentence handed down. The dashas and transits describe the season you’re in and the winds available, but how you sail is yours. Understood this way, jyotiṣa is a tool for self-knowledge and good timing, not a prediction to fear.',
    forToday: 'The sky suggests; it does not command. Knowing the season, you choose how to move through it.',
  },
];
