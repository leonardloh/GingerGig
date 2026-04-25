/**
 * LandingPage.jsx — 5-slide Heartfelt Story
 *
 * Slide 1 — Hero
 * Slide 2 — Makcik Siti   · Homemade food (Kepong)
 * Slide 3 — Lee Siew Lan  · Babysitting   (Petaling Jaya)
 * Slide 4 — Paati Kamala  · Home tuition  (Klang)
 * Slide 5 — Closing CTA
 *
 * Language switcher: EN | BM | 中文 | தமிழ்
 * Each language translates all 5 slides.
 * No external images — CSS gradients + inline SVGs.
 */
import { useState, useEffect, useRef } from 'react';
import { GingerLogo, SiteFooter } from './components';
import { LANGUAGES } from './i18n';
import { cdnUrl } from '../config/env';

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG Illustrations
// ─────────────────────────────────────────────────────────────────────────────

// Slide 1 — Hero: abstract warm pattern
const IllustHero = () => (
  <svg viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '100%', opacity: 0.14 }}>
    {/* Concentric rings — warmth radiating out */}
    <circle cx="170" cy="150" r="120" stroke="rgba(232,168,124,0.5)" strokeWidth="1"/>
    <circle cx="170" cy="150" r="90"  stroke="rgba(232,168,124,0.4)" strokeWidth="1.2"/>
    <circle cx="170" cy="150" r="60"  stroke="rgba(232,168,124,0.5)" strokeWidth="1.5"/>
    <circle cx="170" cy="150" r="32"  fill="rgba(194,102,45,0.18)" stroke="#C2662D" strokeWidth="2"/>
    {/* Heart at centre */}
    <path d="M170 157 L163 150 Q155 142 163 134 Q171 126 170 134 Q169 126 177 134 Q185 142 177 150 Z" fill="#C2662D"/>
    {/* Dots on rings */}
    {[0,45,90,135,180,225,270,315].map((deg, i) => {
      const r = 90; const rad = deg * Math.PI / 180;
      return <circle key={i} cx={170 + r * Math.cos(rad)} cy={150 + r * Math.sin(rad)} r="3.5" fill="rgba(232,168,124,0.6)"/>;
    })}
    {[0,60,120,180,240,300].map((deg, i) => {
      const r = 120; const rad = deg * Math.PI / 180;
      return <circle key={i} cx={170 + r * Math.cos(rad)} cy={150 + r * Math.sin(rad)} r="2.5" fill="rgba(232,168,124,0.35)"/>;
    })}
    {/* Gig type labels (abstract) */}
    <rect x="60"  y="40"  width="64" height="20" rx="10" fill="rgba(194,102,45,0.25)"/>
    <rect x="218" y="40"  width="64" height="20" rx="10" fill="rgba(194,102,45,0.2)"/>
    <rect x="36"  y="240" width="70" height="20" rx="10" fill="rgba(194,102,45,0.2)"/>
    <rect x="234" y="240" width="70" height="20" rx="10" fill="rgba(194,102,45,0.25)"/>
  </svg>
);

// Slide 2 — Cooking: pot + steam
const IllustCook = () => (
  <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '100%', opacity: 0.2 }}>
    <rect x="60" y="172" width="200" height="14" rx="7" fill="#E8A87C"/>
    <rect x="80" y="152" width="160" height="24" rx="8" fill="#C2662D"/>
    <ellipse cx="160" cy="150" rx="58" ry="14" fill="#A0522D"/>
    <rect x="102" y="90" width="116" height="64" rx="14" fill="#A0522D"/>
    <rect x="78"  y="138" width="18"  height="11" rx="5" fill="#8B4513"/>
    <rect x="224" y="138" width="18"  height="11" rx="5" fill="#8B4513"/>
    <path d="M130 86 Q125 70 132 54 Q139 38 134 22" stroke="#E8A87C" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M160 82 Q155 64 162 46 Q169 28 164 14" stroke="#E8A87C" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M190 86 Q185 70 192 54 Q199 38 194 22" stroke="#E8A87C" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M208 132 L246 92" stroke="#C2662D" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="202" cy="136" r="11" stroke="#C2662D" strokeWidth="3.5"/>
    <rect x="28" y="98" width="22" height="34" rx="5" fill="rgba(232,168,124,0.35)"/>
    <rect x="56" y="108" width="17" height="24" rx="5" fill="rgba(232,168,124,0.25)"/>
    <line x1="20" y1="102" x2="80" y2="102" stroke="rgba(232,168,124,0.4)" strokeWidth="2"/>
    <text x="160" y="250" textAnchor="middle" fill="rgba(232,168,124,0.35)" fontSize="12" fontFamily="sans-serif" letterSpacing="3">MASAKAN RUMAH</text>
  </svg>
);

// Slide 3 — Babysitting: Ah Ma with children
const IllustBabysit = () => (
  <svg viewBox="0 0 320 300" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '100%', opacity: 0.2 }}>
    {/* Ah Ma — centre figure */}
    <circle cx="160" cy="88" r="28" fill="rgba(232,168,124,0.45)" stroke="#E8A87C" strokeWidth="2.5"/>
    <path d="M122 180 Q120 148 160 148 Q200 148 198 180" fill="rgba(232,168,124,0.25)" stroke="#E8A87C" strokeWidth="2.5"/>
    {/* Hair lines (elderly) */}
    <path d="M140 70 Q142 60 150 64" stroke="rgba(232,168,124,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M178 70 Q178 60 170 64" stroke="rgba(232,168,124,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Child left */}
    <circle cx="88" cy="140" r="20" fill="rgba(194,102,45,0.3)" stroke="#C2662D" strokeWidth="2"/>
    <path d="M66 200 Q66 174 88 174 Q110 174 110 200" fill="rgba(194,102,45,0.2)" stroke="#C2662D" strokeWidth="2"/>
    {/* Child right */}
    <circle cx="232" cy="140" r="20" fill="rgba(194,102,45,0.3)" stroke="#C2662D" strokeWidth="2"/>
    <path d="M210 200 Q210 174 232 174 Q254 174 254 200" fill="rgba(194,102,45,0.2)" stroke="#C2662D" strokeWidth="2"/>
    {/* Holding hands */}
    <line x1="122" y1="165" x2="108" y2="157" stroke="#E8A87C" strokeWidth="3" strokeLinecap="round"/>
    <line x1="198" y1="165" x2="212" y2="157" stroke="#E8A87C" strokeWidth="3" strokeLinecap="round"/>
    {/* Toys on floor */}
    <rect x="65"  y="224" width="24" height="24" rx="5"  fill="rgba(194,102,45,0.2)" stroke="rgba(232,168,124,0.4)" strokeWidth="1.5"/>
    <circle cx="160" cy="234" r="14" fill="rgba(194,102,45,0.18)" stroke="rgba(232,168,124,0.4)" strokeWidth="1.5"/>
    <rect x="228" y="224" width="24" height="24" rx="12" fill="rgba(194,102,45,0.2)" stroke="rgba(232,168,124,0.4)" strokeWidth="1.5"/>
    <path d="M152 234 L168 234 M160 226 L160 242" stroke="rgba(232,168,124,0.5)" strokeWidth="1.5"/>
    {/* Heart above */}
    <path d="M160 70 L156 65 Q151 59 156 53 Q161 47 160 54 Q159 47 164 53 Q169 59 164 65 Z" fill="#C2662D"/>
  </svg>
);

// Slide 4 — Teaching: chalkboard + books
const IllustTeach = () => (
  <svg viewBox="0 0 320 300" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '100%', opacity: 0.2 }}>
    {/* Chalkboard */}
    <rect x="40" y="40" width="220" height="140" rx="8" fill="rgba(30,50,30,0.6)" stroke="rgba(232,168,124,0.4)" strokeWidth="2"/>
    <rect x="48" y="48" width="204" height="124" rx="5" fill="rgba(20,40,20,0.5)"/>
    {/* Chalk writing — math equations */}
    <text x="68" y="82"  fill="rgba(232,168,124,0.65)" fontSize="16" fontFamily="Georgia,serif">2x + 5 = 15</text>
    <text x="68" y="108" fill="rgba(232,168,124,0.5)"  fontSize="14" fontFamily="Georgia,serif">x = 5  ✓</text>
    <line x1="68" y1="118" x2="200" y2="118" stroke="rgba(232,168,124,0.2)" strokeWidth="1"/>
    <text x="68" y="140" fill="rgba(232,168,124,0.4)"  fontSize="13" fontFamily="Georgia,serif">π r² = area</text>
    <text x="68" y="160" fill="rgba(232,168,124,0.3)"  fontSize="12" fontFamily="Georgia,serif">You can do this!</text>
    {/* Board tray */}
    <rect x="40" y="178" width="220" height="10" rx="3" fill="rgba(194,102,45,0.3)"/>
    <rect x="55" y="181" width="32" height="5" rx="2" fill="rgba(232,168,124,0.5)"/>
    {/* Books stack */}
    <rect x="52"  y="218" width="88" height="14" rx="3" fill="rgba(194,102,45,0.4)"/>
    <rect x="58"  y="204" width="76" height="16" rx="3" fill="rgba(194,102,45,0.3)"/>
    <rect x="62"  y="192" width="68" height="14" rx="3" fill="rgba(194,102,45,0.25)"/>
    <rect x="52"  y="232" width="88" height="5"  rx="2" fill="rgba(139,69,19,0.3)"/>
    {/* Pencil */}
    <rect x="198" y="200" width="8" height="52" rx="3" fill="rgba(232,168,124,0.5)" transform="rotate(-15 202 226)"/>
    <path d="M193 248 L198 252 L203 248" fill="rgba(194,102,45,0.7)"/>
    {/* Star (student achievement) */}
    <path d="M262 50 L265 60 L276 60 L267 67 L271 77 L262 70 L253 77 L257 67 L248 60 L259 60 Z"
      fill="rgba(232,168,124,0.5)" stroke="rgba(232,168,124,0.3)" strokeWidth="1"/>
    <text x="262" y="98" textAnchor="middle" fill="rgba(232,168,124,0.55)" fontSize="18" fontFamily="Georgia,serif" fontWeight="bold">A</text>
    <circle cx="262" cy="94" r="14" stroke="rgba(232,168,124,0.3)" strokeWidth="1.5" fill="none"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Story content — 4 languages
// ─────────────────────────────────────────────────────────────────────────────
const SLIDES = {
  en: [
    {
      type: 'hero',
      panel: 'linear-gradient(160deg, #1e0a03 0%, #2d1206 40%, #1a0802 100%)',
      illust: <IllustHero />,
      eyebrow: 'A platform built for them',
      heading: 'Their hands\nnever retired.',
      sub: 'Three women. Three gifts. One platform that finally noticed.',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0a0501 0%, #291005 50%, #160803 100%)',
      illust: <IllustCook />,
      badge: 'Homemade food · Kepong, KL',
      name: 'Makcik Siti, 64',
      heading: '"The rendang\nfound its way home."',
      story: 'Siti has been stirring the same pot of rendang for forty years — slow fire, no shortcuts, just love. When her children left, the house fell quiet and she kept cooking anyway. Now strangers call her food the best they have ever tasted, and the house has never smelled more alive.',
      closing: 'She earned RM 2,840 in her first three months.',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0d0d1e 0%, #13112a 50%, #0a0912 100%)',
      illust: <IllustBabysit />,
      badge: 'Childcare · Petaling Jaya',
      name: 'Lee Siew Lan, 61',
      heading: '"Four little ones\ncall her Ah Ma."',
      story: 'The young mother next door could not afford nursery fees — she asked Siew Lan if she could look after her baby, just until 6pm. That baby is now four years old, calls her Ah Ma, and brings her a drawing every morning. Siew Lan cares for four children now, and says she has finally stopped counting the days.',
      closing: '4 children. Every day. By choice.',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0a0200 0%, #1e0803 50%, #0f0401 100%)',
      illust: <IllustTeach />,
      badge: 'Home tuition · Klang',
      name: 'Paati Kamala, 66',
      heading: '"The classroom\nwas never a building."',
      story: 'A neighbour\'s son was failing Form 3 — Kamala offered to help, just once. He scored an A, and his mother cried at the door. That evening Kamala realised the classroom was never the building — it was always her.',
      closing: 'First 5-star review: "Best teacher I ever had."',
    },
    {
      type: 'join',
      panel: 'linear-gradient(160deg, #1e0a03 0%, #3d1a07 50%, #1a0802 100%)',
      illust: null,
      heading: 'Still warm.\nStill needed.\nStill here.',
      body: 'Three gifts the world almost missed.\nHelp us make sure no one is overlooked.',
      cta: 'Join Ginger Gig',
      signin: 'Already have an account? Sign in',
    },
  ],

  ms: [
    {
      type: 'hero',
      panel: 'linear-gradient(160deg, #1e0a03 0%, #2d1206 40%, #1a0802 100%)',
      illust: <IllustHero />,
      eyebrow: 'Platform yang dibina untuk mereka',
      heading: 'Tangan mereka\ntidak pernah bersara.',
      sub: 'Tiga wanita. Tiga bakat. Satu platform yang akhirnya memperhatikan mereka.',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0a0501 0%, #291005 50%, #160803 100%)',
      illust: <IllustCook />,
      badge: 'Masakan rumah · Kepong, KL',
      name: 'Makcik Siti, 64 tahun',
      heading: '"Rendang itu\npulang ke rumahnya."',
      story: 'Siti mengacau periuk rendang yang sama selama empat puluh tahun — api perlahan, tiada jalan pintas, hanya kasih sayang. Bila anak-anaknya pergi, rumah menjadi sunyi dan dia tetap memasak juga. Kini orang-orang asing berkata masakan dia yang terbaik pernah mereka rasa, dan rumah tidak pernah berbau semeriah ini.',
      closing: 'Dia menjana RM 2,840 dalam tiga bulan pertama.',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0d0d1e 0%, #13112a 50%, #0a0912 100%)',
      illust: <IllustBabysit />,
      badge: 'Jagaan kanak-kanak · Petaling Jaya',
      name: 'Lee Siew Lan, 61 tahun',
      heading: '"Empat anak kecil\nmemanggilnya Ah Ma."',
      story: 'Ibu muda di sebelah tidak mampu bayar taska — dia meminta Siew Lan jaga bayinya, hingga pukul 6 petang sahaja. Bayi itu kini berumur empat tahun, memanggil dia Ah Ma, dan membawa lukisan setiap pagi. Siew Lan kini menjaga empat anak kecil, dan berkata dia akhirnya berhenti mengira hari-hari.',
      closing: '4 anak kecil. Setiap hari. Dengan rela hati.',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0a0200 0%, #1e0803 50%, #0f0401 100%)',
      illust: <IllustTeach />,
      badge: 'Tuisyen rumah · Klang',
      name: 'Paati Kamala, 66 tahun',
      heading: '"Bilik darjah itu\nbukan sebuah bangunan."',
      story: 'Anak jiran gagal Tingkatan 3 — Kamala tawarkan bantuan, sekali sahaja katanya. Budak itu dapat A, dan ibunya menangis di depan pintu. Malam itu Kamala sedar bilik darjah itu bukan bangunan — ia sentiasa dirinya sendiri.',
      closing: 'Ulasan bintang 5 pertama: "Cikgu terbaik yang pernah saya ada."',
    },
    {
      type: 'join',
      panel: 'linear-gradient(160deg, #1e0a03 0%, #3d1a07 50%, #1a0802 100%)',
      illust: null,
      heading: 'Masih hangat.\nMasih diperlukan.\nMasih di sini.',
      body: 'Tiga bakat yang hampir terlepas pandang oleh dunia.\nBantu kami memastikan tiada siapa yang diabaikan.',
      cta: 'Sertai Ginger Gig',
      signin: 'Sudah ada akaun? Log masuk',
    },
  ],

  zh: [
    {
      type: 'hero',
      panel: 'linear-gradient(160deg, #1e0a03 0%, #2d1206 40%, #1a0802 100%)',
      illust: <IllustHero />,
      eyebrow: '为她们而建的平台',
      heading: '她们的双手\n从未退休。',
      sub: '三位女性。三份天赋。一个终于看见她们的平台。',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0a0501 0%, #291005 50%, #160803 100%)',
      illust: <IllustCook />,
      badge: '家常料理 · 格宾 Kepong',
      name: '西蒂阿姨，64岁',
      heading: '"那锅渣打\n找到了回家的路。"',
      story: '西蒂阿姨用同样的方式煮渣打鸡肉四十年了——小火慢炖，从不偷工减料，只有爱。孩子们离家后，她依然每天煮，因为她不知道还能用什么填满这份寂静。如今陌生人说，这是他们吃过最好吃的家乡味，家里从来没有这么香过。',
      closing: '她在头三个月赚了 RM 2,840。',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0d0d1e 0%, #13112a 50%, #0a0912 100%)',
      illust: <IllustBabysit />,
      badge: '托儿服务 · 八打灵再也 PJ',
      name: '李秀兰，61岁',
      heading: '"四个孩子\n叫她阿嬷。"',
      story: '隔壁年轻妈妈付不起托儿所费用，问秀兰能否照看孩子，只要到下午六点就好。那个孩子现在四岁了，叫她阿嬷，每天早上给她画一幅画。秀兰现在照顾四个小朋友，说她终于不再数日子了。',
      closing: '四个孩子。每一天。心甘情愿。',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0a0200 0%, #1e0803 50%, #0f0401 100%)',
      illust: <IllustTeach />,
      badge: '家庭补习 · 巴生 Klang',
      name: '卡玛拉，66岁',
      heading: '"课室从来不是\n一幢建筑物。"',
      story: '邻居的孩子数学不及格——卡玛拉说她只帮一次。结果孩子考了A，妈妈哭着站在门口。那天晚上卡玛拉才明白：课室从来不是那幢楼，而是她自己。',
      closing: '第一个五星好评："我遇过最好的老师。"',
    },
    {
      type: 'join',
      panel: 'linear-gradient(160deg, #1e0a03 0%, #3d1a07 50%, #1a0802 100%)',
      illust: null,
      heading: '依然温暖。\n依然被需要。\n依然在这里。',
      body: '三份差点被世界错过的天赋。\n帮助我们，让每一个人都被看见。',
      cta: '加入 Ginger Gig',
      signin: '已有账户？登入',
    },
  ],

  ta: [
    {
      type: 'hero',
      panel: 'linear-gradient(160deg, #1e0a03 0%, #2d1206 40%, #1a0802 100%)',
      illust: <IllustHero />,
      eyebrow: 'அவர்களுக்காக உருவாக்கப்பட்ட இயங்குதளம்',
      heading: 'அவர்கள் கைகள்\nஒருபோதும் ஓய்வெடுக்கவில்லை.',
      sub: 'மூன்று பெண்கள். மூன்று திறமைகள். இறுதியாக அவர்களை கவனித்த ஒரு இயங்குதளம்.',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0a0501 0%, #291005 50%, #160803 100%)',
      illust: <IllustCook />,
      badge: 'வீட்டு சமையல் · கேபாங், KL',
      name: 'மக்சிக் சிட்டி, வயது 64',
      heading: '"அந்த ரெண்டாங்\nவீடு திரும்பியது."',
      story: 'சிட்டி நாற்பது ஆண்டுகளாக ஒரே முறையில் ரெண்டாங் சமைக்கிறார் — மெதுவான தீ, அன்பு மட்டுமே. குழந்தைகள் சென்றபோது வீடு அமைதியாகியது, ஆனால் அவர் சமைப்பதை தொடர்ந்தார். இப்போது அந்நியர்கள் இதுவரை சாப்பிட்ட சிறந்த சமையல் என்கிறார்கள், வீடு இவ்வளவு உயிரோட்டமாக வாசமிட்டதில்லை.',
      closing: 'முதல் மூன்று மாதங்களில் RM 2,840 சம்பாதித்தார்.',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0d0d1e 0%, #13112a 50%, #0a0912 100%)',
      illust: <IllustBabysit />,
      badge: 'குழந்தை பராமரிப்பு · பெட்டாலிங் ஜெய்யா',
      name: 'லீ சியூ லான், வயது 61',
      heading: '"நான்கு சிறு குழந்தைகள்\nஅவரை அம்மா என்கிறார்கள்."',
      story: 'பக்கத்து வீட்டு இளம் தாயால்託兒所 கட்டணம் செலுத்த முடியவில்லை — மாலை 6 மணி வரை குழந்தையை பார்க்குமாறு சியூ லானிடம் கேட்டார். அந்த குழந்தைக்கு இப்போது நான்கு வயது, அவரை அம்மா என்று அழைக்கிறது, ஒவ்வொரு காலையும் படம் வரைந்து தருகிறது. சியூ லான் இப்போது நான்கு குழந்தைகளை돌보கிறார், நாட்களை எண்ணுவதை நிறுத்திவிட்டதாக சொல்கிறார்.',
      closing: '4 குழந்தைகள். ஒவ்வொரு நாளும். மனமுவந்து.',
    },
    {
      type: 'story',
      panel: 'linear-gradient(160deg, #0a0200 0%, #1e0803 50%, #0f0401 100%)',
      illust: <IllustTeach />,
      badge: 'வீட்டு கல்வி · கிளாங்',
      name: 'பாட்டி கமலா, வயது 66',
      heading: '"வகுப்பறை என்பது\nஒரு கட்டிடமில்லை."',
      story: 'அண்டை வீட்டு பையன் கணிதத்தில் தோல்வியடைந்தான் — கமலா ஒரு முறை மட்டும் உதவுவதாக சொன்னார். அவன் A பெற்றான், அவன் அம்மா கதவருகே அழுதாள். அன்று இரவு கமலா உணர்ந்தார்: வகுப்பறை என்பது கட்டிடம் அல்ல — அது எப்போதும் அவர்தான்.',
      closing: 'முதல் ஐந்து நட்சத்திர மதிப்பீடு: "நான் பார்த்த சிறந்த ஆசிரியர்."',
    },
    {
      type: 'join',
      panel: 'linear-gradient(160deg, #1e0a03 0%, #3d1a07 50%, #1a0802 100%)',
      illust: null,
      heading: 'இன்னும் அன்பானவர்கள்.\nஇன்னும் தேவைப்படுகிறார்கள்.\nஇன்னும் இங்கே இருக்கிறார்கள்.',
      body: 'உலகம் கவனிக்காமல் தவறவிட்ட மூன்று திறமைகள்.\nயாரும் கவனிக்கப்படாமல் போகாமல் இருக்க உதவுங்கள்.',
      cta: 'Ginger Gig-இல் சேருங்கள்',
      signin: 'ஏற்கனவே கணக்கு இருக்கிறதா? உள்நுழையுங்கள்',
    },
  ],
};

const SIGNIN_LABEL = {
  en: 'Sign in',
  ms: 'Log masuk',
  zh: '登入',
  ta: 'உள்நுழை',
};

// ─────────────────────────────────────────────────────────────────────────────
// Slide background images — language-agnostic, drop paths here when ready.
// bgPosition: 'right center' keeps subject on the right (text lives on left).
// Slide 5 uses 'center center' so image bleeds through everywhere.
// ─────────────────────────────────────────────────────────────────────────────
// Overlays are stacked ON TOP of the photo using CSS multi-background:
//   backgroundImage: "gradient, url(photo)" — gradient renders above photo, no z-index clash.
const SLIDE_IMAGES = [
  { src: cdnUrl('/hero.png'),    bgPosition: 'center center',
    overlay: 'linear-gradient(rgba(0,0,0,0.58),rgba(0,0,0,0.58))' },
  { src: cdnUrl('/slide-1.png'), bgPosition: 'center center',
    overlay: 'linear-gradient(to right,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.65) 42%,rgba(0,0,0,0.28) 100%)' },
  { src: cdnUrl('/slide-2.png'), bgPosition: 'center center',
    overlay: 'linear-gradient(to right,rgba(0,0,0,0.90) 0%,rgba(0,0,0,0.68) 44%,rgba(0,0,0,0.30) 100%)' },
  { src: cdnUrl('/slide-3.png'), bgPosition: 'center center',
    overlay: 'linear-gradient(to right,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.72) 46%,rgba(0,0,0,0.42) 100%)' },
  // Slide 5 — woman composed on left in source image; overlay darkens the right for text
  { src: cdnUrl('/slide-4.png'), bgPosition: 'center center',
    overlay: 'linear-gradient(to left,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.60) 48%,rgba(0,0,0,0.10) 100%)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function LandingPage({ onEnter, lang: langProp, setLang: setLangProp }) {
  const [langLocal, setLangLocal] = useState('en');
  const lang = langProp ?? langLocal;
  const setLang = setLangProp ?? setLangLocal;
  const containerRef = useRef(null);
  const contentRefs = useRef([]);

  // Fade-in on scroll entry
  useEffect(() => {
    contentRefs.current.forEach((el) => el?.classList.remove('lp-in'));
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('lp-in'); }),
      { threshold: 0.12 },
    );
    requestAnimationFrame(() => {
      contentRefs.current.forEach((el) => el && obs.observe(el));
    });
    return () => obs.disconnect();
  }, [lang]);

  const scrollTo = (i) =>
    containerRef.current?.scrollTo({ top: i * containerRef.current.clientHeight, behavior: 'smooth' });

  const slides = SLIDES[lang];

  const fontFamily = lang === 'ta'
    ? '"Noto Sans Tamil","Latha","Tamil MN","Plus Jakarta Sans",sans-serif'
    : lang === 'zh'
      ? '"PingFang SC","Microsoft YaHei","Noto Sans SC","Plus Jakarta Sans",sans-serif'
      : '"Plus Jakarta Sans","Segoe UI",system-ui,sans-serif';  // en and ms share Latin stack

  return (
    <div
      ref={containerRef}
      style={{
        height: '100vh', overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        background: '#0d0602', fontFamily,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <style>{`
        /* ── Layout ── */
        .lp-slide {
          position: relative; min-height: 100vh;
          scroll-snap-align: start;
          display: flex; align-items: center;
          overflow: hidden;
        }
        .lp-panel {
          position: absolute; inset: 0;
          background-size: cover; background-repeat: no-repeat;
        }
        .lp-panel::after {
          content: ''; position: absolute; inset: 0;
          background-image:
            radial-gradient(ellipse at 15% 85%, rgba(194,102,45,0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 15%, rgba(194,102,45,0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        /* ── Entrance animation ── */
        .lp-content {
          position: relative; z-index: 2;
          width: 100%; max-width: 1120px;
          margin: 0 auto; padding: 96px 64px 80px;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 56px; align-items: center;
          opacity: 0; transform: translateY(28px);
          transition: opacity 1s cubic-bezier(.22,1,.36,1), transform 1s cubic-bezier(.22,1,.36,1);
        }
        .lp-content.full { grid-template-columns: 1fr; max-width: 760px; text-align: center; }
        /* Story slides with photo: text left-aligned, photo shows on right */
        .lp-content.photo { grid-template-columns: 1fr; max-width: 560px; margin: 0 auto 0 max(40px, calc((100vw - 1120px)/2 + 64px)); text-align: left; }
        /* Closing slide: woman on left, text anchored to the right */
        .lp-content.right { grid-template-columns: 1fr; max-width: 560px; margin: 0 max(40px, calc((100vw - 1120px)/2 + 64px)) 0 auto; text-align: right; }
        .lp-in { opacity: 1 !important; transform: none !important; }
        .lp-text { min-width: 0; }
        .lp-illust { display: flex; align-items: center; justify-content: center; height: 320px; }

        /* ── Eyebrow / badge labels ── */
        .lp-eyebrow {
          font-size: 12px; font-weight: 800; letter-spacing: 0.22em;
          text-transform: uppercase; color: #C2662D; margin-bottom: 20px;
          display: flex; align-items: center; gap: 10px;
        }
        .lp-eyebrow::before {
          content: ''; display: block; width: 28px; height: 2px;
          background: #C2662D; border-radius: 2px; flex-shrink: 0;
        }
        /* Centred variant — symmetric lines on both sides */
        .lp-eyebrow-center {
          font-size: 12px; font-weight: 800; letter-spacing: 0.22em;
          text-transform: uppercase; color: #C2662D; margin-bottom: 28px;
          display: flex; align-items: center; justify-content: center; gap: 14px;
        }
        .lp-eyebrow-center::before,
        .lp-eyebrow-center::after {
          content: ''; display: block; width: 36px; height: 2px;
          background: #C2662D; border-radius: 2px; flex-shrink: 0;
        }
        /* Right-aligned eyebrow: single decorative line on the left */
        .lp-eyebrow-right {
          font-size: 12px; font-weight: 800; letter-spacing: 0.22em;
          text-transform: uppercase; color: #C2662D; margin-bottom: 28px;
          display: flex; align-items: center; justify-content: flex-end; gap: 14px;
        }
        .lp-eyebrow-right::before {
          content: ''; display: block; width: 36px; height: 2px;
          background: #C2662D; border-radius: 2px; flex-shrink: 0;
        }
        .lp-badge {
          display: inline-block;
          background: rgba(194,102,45,0.18);
          border: 1px solid rgba(194,102,45,0.35);
          color: #E8A87C; font-size: 12px; font-weight: 700;
          letter-spacing: 0.06em; padding: 5px 14px;
          border-radius: 99px; margin-bottom: 14px;
        }
        .lp-name {
          font-size: 14px; font-weight: 700;
          color: rgba(255,255,255,0.75);
          letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 20px;
          text-shadow: 0 1px 6px rgba(0,0,0,0.5);
        }

        /* ── Headings ── */
        .lp-h {
          font-family: "DM Serif Display","Georgia","Times New Roman",serif;
          font-size: clamp(38px, 5vw, 68px);
          font-weight: 400; line-height: 1.07; color: #fff;
          margin: 0 0 28px; white-space: pre-wrap;
          text-shadow: 0 2px 20px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5);
        }
        .lang-zh .lp-h {
          font-family: inherit; font-weight: 700;
          font-size: clamp(32px, 4.5vw, 58px); letter-spacing: 0;
        }
        .lang-ta .lp-h {
          font-family: inherit; font-weight: 700;
          font-size: clamp(22px, 3vw, 38px); letter-spacing: 0;
        }
        /* Closing slide: sans-serif, bolder, tighter — feels like a final statement */
        .lp-h-close {
          font-family: "Plus Jakarta Sans","Segoe UI",system-ui,sans-serif;
          font-size: clamp(34px, 4.5vw, 60px);
          font-weight: 800; line-height: 1.1; color: #fff;
          margin: 0 0 28px; white-space: pre-wrap; letter-spacing: -0.02em;
          text-shadow: 0 2px 24px rgba(0,0,0,0.4);
        }
        .lang-zh .lp-h-close {
          font-family: inherit; letter-spacing: 0;
        }
        .lang-ta .lp-h-close {
          font-family: inherit; letter-spacing: 0;
          font-size: clamp(14px, 2vw, 26px);
        }
        /* Tamil eyebrow: compress spacing so it stays single line */
        .lang-ta .lp-eyebrow-right {
          letter-spacing: 0.05em;
        }
        .lang-ms .lp-h-close {
          font-size: clamp(26px, 3.5vw, 48px); letter-spacing: -0.01em;
        }
        /* BM eyebrow: tighter spacing so the longer text stays on one line */
        .lang-ms .lp-eyebrow-right {
          letter-spacing: 0.08em;
        }
        .lp-hero-sub {
          font-family: "DM Serif Display","Georgia",serif;
          font-style: italic; font-size: clamp(18px,1.9vw,23px);
          color: rgba(255,255,255,0.52); line-height: 1.5; margin-top: -8px;
        }
        .lang-zh .lp-hero-sub, .lang-ta .lp-hero-sub {
          font-family: inherit; font-style: normal;
          font-size: clamp(16px,1.7vw,20px);
        }

        /* ── Story paragraph (larger for elderly readability) ── */
        .lp-story {
          font-size: clamp(17px, 1.75vw, 19px);
          color: rgba(255,255,255,0.92);
          line-height: 1.95; margin: 0 0 22px;
          font-weight: 400; letter-spacing: 0.01em;
          text-shadow: 0 1px 8px rgba(0,0,0,0.5);
        }
        .lang-zh .lp-story { font-size: clamp(16px,1.6vw,18px); line-height: 2.05; }
        .lang-ta .lp-story { font-size: clamp(15px,1.55vw,17px); line-height: 2.15; }

        /* ── Closing line / stat ── */
        .lp-closing {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 14px; font-weight: 700;
          color: #FFD4A8; letter-spacing: 0.05em;
          margin-top: 6px;
          text-shadow: 0 1px 6px rgba(0,0,0,0.6);
        }
        .lp-closing::before {
          content: ''; display: block; width: 22px; height: 2px;
          background: #E8A87C; border-radius: 2px;
        }

        /* ── Join slide body ── */
        .lp-join-body {
          font-size: clamp(18px,1.9vw,21px);
          color: rgba(255,255,255,0.7);
          line-height: 1.9; white-space: pre-wrap;
          margin: 0 auto 0; max-width: 540px;
        }
        .lang-ms .lp-join-body { font-size: clamp(14px,1.4vw,16px); }
        .lang-zh .lp-join-body { font-size: clamp(17px,1.7vw,19px); }
        .lang-ta .lp-join-body { font-size: clamp(11px, 1.2vw, 14px); line-height: 2; }

        /* ── CTA buttons ── */
        .lp-content.right .lp-cta-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 18px; margin-top: 48px; }
        .lp-cta-wrap { display: flex; flex-direction: column; align-items: center; gap: 18px; margin-top: 48px; }
        .lp-cta {
          appearance: none; border: 0;
          background: #C2662D; color: #fff;
          font-size: 18px; font-weight: 700;
          padding: 20px 60px; border-radius: 99px; cursor: pointer;
          box-shadow: 0 4px 32px rgba(194,102,45,0.5);
          transition: transform .15s, box-shadow .15s, background .15s;
          min-height: 60px; letter-spacing: 0.02em;
        }
        .lp-cta:hover { background: #d4733a; transform: translateY(-3px); box-shadow: 0 12px 40px rgba(194,102,45,0.55); }
        .lp-signin {
          background: transparent; border: 0;
          color: rgba(255,255,255,0.38); font-size: 16px; cursor: pointer;
          text-decoration: underline; text-underline-offset: 4px;
          transition: color .15s;
        }
        .lp-signin:hover { color: rgba(255,255,255,0.72); }

        /* ── Top bar ── */
        .lp-bar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 18px 36px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          background: linear-gradient(to bottom, rgba(10,5,1,0.85) 0%, transparent 100%);
        }
        .lp-brand { display: flex; align-items: center; flex-shrink: 0; }
        .lp-brand-logo {
          height: 36px; width: auto; display: block;
          filter: brightness(0) invert(1);
        }
        .lp-lang-wrap { display: flex; align-items: center; gap: 3px; }
        .lp-lang-btn {
          appearance: none; border: 0;
          background: transparent; color: rgba(255,255,255,0.35);
          font-size: 13px; font-weight: 700; padding: 6px 10px;
          border-radius: 8px; cursor: pointer;
          transition: background .15s, color .15s; letter-spacing: 0.04em;
        }
        .lp-lang-btn:hover { color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.07); }
        .lp-lang-btn.active { background: rgba(194,102,45,0.22); color: #E8A87C; border: 1px solid rgba(194,102,45,0.35); }
        .lp-lang-sep { color: rgba(255,255,255,0.14); font-size: 12px; user-select: none; }
        .lp-bar-btn {
          appearance: none; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.28);
          background: rgba(255,255,255,0.07); backdrop-filter: blur(8px);
          color: #fff; font-size: 14px; font-weight: 600;
          padding: 9px 22px; border-radius: 99px; cursor: pointer;
          transition: background .15s, border-color .15s; min-height: 42px;
        }
        .lp-bar-btn:hover { background: rgba(255,255,255,0.16); border-color: rgba(255,255,255,0.55); }

        /* ── Nav dots ── */
        .lp-dots {
          position: fixed; right: 24px; top: 50%; transform: translateY(-50%);
          z-index: 100; display: flex; flex-direction: column; gap: 12px;
        }
        .lp-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(255,255,255,0.2);
          border: 0; padding: 0; cursor: pointer;
          transition: background .2s, transform .2s;
        }
        .lp-dot:hover { background: #C2662D; transform: scale(1.5); }

        /* ── Scroll hint ── */
        .lp-hint {
          position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);
          z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 8px;
          color: rgba(255,255,255,0.25); font-size: 10px; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
          animation: lp-bounce 2.6s ease-in-out infinite;
        }
        @keyframes lp-bounce {
          0%,100% { transform: translateX(-50%) translateY(0); }
          55%      { transform: translateX(-50%) translateY(10px); }
        }

        /* ── Responsive ── */
        @media (max-width: 820px) {
          .lp-content { grid-template-columns: 1fr; padding: 90px 28px 80px; gap: 28px; }
          .lp-illust { height: 220px; order: -1; }
          .lp-dots { right: 12px; }
          .lp-bar { padding: 14px 18px; }
          .lp-brand-logo { height: 30px; }
          .lp-lang-btn { padding: 5px 8px; font-size: 12px; }
        }
      `}</style>

      {/* Top bar */}
      <div className="lp-bar">
        <div className="lp-brand">
          <img src={cdnUrl('/gingergig-wordmark.png')} alt="Ginger Gig" className="lp-brand-logo" />
        </div>

        <div className="lp-lang-wrap">
          {LANGUAGES.map((l, i) => (
            <span key={l.code} style={{ display: 'contents' }}>
              <button
                className={`lp-lang-btn${lang === l.code ? ' active' : ''}`}
                onClick={() => setLang(l.code)}
                title={l.name}
              >
                {l.short}
              </button>
              {i < LANGUAGES.length - 1 && <span className="lp-lang-sep">·</span>}
            </span>
          ))}
        </div>

        <button className="lp-bar-btn" onClick={onEnter}>{SIGNIN_LABEL[lang]}</button>
      </div>

      {/* Nav dots */}
      <div className="lp-dots">
        {slides.map((_, i) => (
          <button key={i} className="lp-dot" onClick={() => scrollTo(i)} aria-label={`Slide ${i + 1}`} />
        ))}
      </div>

      {/* Slides */}
      {slides.map((slide, i) => {
        const img = SLIDE_IMAGES[i];
        return (
          <div key={`${lang}-${i}`} className={`lp-slide lang-${lang}`} style={{ background: slide.panel }}>
            {/* overlay gradient stacked above photo in one background-image — no z-index clash */}
            <div
              className="lp-panel"
              style={img.src ? {
                backgroundImage: `${img.overlay}, url(${img.src})`,
                backgroundPosition: `center, ${img.bgPosition}`,
                backgroundSize: 'cover, cover',
              } : {}}
            />

            <div
              ref={(el) => (contentRefs.current[i] = el)}
              className={`lp-content${slide.type === 'join' ? ' right' : img.src ? ' photo' : ''}`}
            >
              {/* ── Hero ── */}
              {slide.type === 'hero' && (
                <>
                  <div className="lp-text">
                    <div className="lp-eyebrow">{slide.eyebrow}</div>
                    <div className="lp-h">{slide.heading}</div>
                    <div className="lp-hero-sub">{slide.sub}</div>
                  </div>
                  {/* Show SVG only when no real photo — photo lives in the background */}
                  {!img.src && <div className="lp-illust">{slide.illust}</div>}
                </>
              )}

              {/* ── Story slide ── */}
              {slide.type === 'story' && (
                <>
                  <div className="lp-text">
                    <div className="lp-badge">{slide.badge}</div>
                    <div className="lp-name">{slide.name}</div>
                    <div className="lp-h">{slide.heading}</div>
                    <p className="lp-story">{slide.story}</p>
                    <div className="lp-closing">{slide.closing}</div>
                  </div>
                  {!img.src && <div className="lp-illust">{slide.illust}</div>}
                </>
              )}

              {/* ── Closing / Join ── */}
              {slide.type === 'join' && (
                <>
                  <div className="lp-eyebrow-right">
                    {lang === 'en' && 'Her second chance. Yours too.'}
                    {lang === 'ms' && 'Peluang kedua mereka. Dan milik anda juga.'}
                    {lang === 'zh' && '她们的第二次机会，也是你的。'}
                    {lang === 'ta' && 'அவர்களின் இரண்டாவது வாய்ப்பு. உங்களுக்கும் கூட.'}
                  </div>
                  <div className="lp-h-close">{slide.heading}</div>
                  <p className="lp-join-body">{slide.body}</p>
                  <div className="lp-cta-wrap">
                    <button className="lp-cta" onClick={onEnter}>{slide.cta} →</button>
                    <button className="lp-signin" onClick={onEnter}>{slide.signin}</button>
                  </div>
                </>
              )}
            </div>

            {/* Scroll hint on first slide only */}
            {i === 0 && (
              <div className="lp-hint">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
                {lang === 'en' && 'their stories'}
                {lang === 'ms' && 'kisah mereka'}
                {lang === 'zh' && '她们的故事'}
                {lang === 'ta' && 'அவர்கள் கதை'}
              </div>
            )}

            {/* Footer sits inside the last slide so scroll-snap doesn't fight it */}
            {i === slides.length - 1 && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                <SiteFooter variant="dark" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default LandingPage;
