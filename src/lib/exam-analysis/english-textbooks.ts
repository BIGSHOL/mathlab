/**
 * 2022 개정 영어 교과서 Lesson/Unit 카탈로그.
 * 소스: data/english-textbooks/{middle,high}-units.md
 *        + {middle,high}-unit-details.md (본문·문법·의사소통)
 * 재생성: npx tsx scripts/generate-english-textbooks.ts
 *
 * 출제범위(업로드)용. 문항 topic 분류(문법/독해 항목)는 english-topics.ts 가 담당.
 */

export interface EnglishTextbookLesson {
  title: string;
  /** 읽기 본문 제목 */
  passage?: string;
  /** 해당 레슨 핵심 문법 */
  grammar?: string;
  /** 의사소통 기능 */
  functions?: string;
  /** 소재 힌트 (공식 Topic이 아닌 경우 포함) */
  topicHint?: string;
}

export interface EnglishTextbook {
  id: string;
  displayName: string;
  course: string;
  grade: string;
  lessons: EnglishTextbookLesson[];
}

export const ENGLISH_TEXTBOOKS: EnglishTextbook[] = [
  {
    id: "중-중1-능률-김기택",
    displayName: "능률 김기택",
    course: "중1",
    grade: "중1",
    lessons: [
      { title: "L1. About You and Me", passage: "Me and My Three Emojis", grammar: "be동사 현재 부정문 / 일반동사 현재 부정문", topicHint: "자기소개·정체성 (본문: 이모지)" },
      { title: "L2. A Delicious World", passage: "Come and Enjoy the Food World Cup!", grammar: "현재진행형 / 동명사", topicHint: "음식·세계 음식" },
      { title: "L3. My Bright Future", passage: "Meeting Friends Again after 20 Years", grammar: "동사 과거형 / 접속사 when", topicHint: "진로·미래" },
      { title: "L4. Be Safe Everywhere", passage: "Stay Safe at School", grammar: "to부정사 명사적(목적어) / 조동사 should·will", topicHint: "학교 안전" },
      { title: "L5. Enjoying Art", passage: "From the Self-Portrait to the Selfie", grammar: "재귀대명사 / to부정사 부사적(목적)", topicHint: "예술·자화상" },
      { title: "L6. Amazing Korea", passage: "Happy Hangeul Day", grammar: "감각동사 look+형용사 / 접속사 because", topicHint: "한국·한글" },
      { title: "L7. Save Earth, Save Us", passage: "You’re an Environmental Superhero!", grammar: "5형식(make+O+형용사) / 접속사 that", topicHint: "환경" },
      { title: "L8. Dive into Stories", passage: "The Story of a Perfect Girl", grammar: "감탄문 / something+형용사", topicHint: "이야기/문학" },
    ],
  },
  {
    id: "중-중2-능률-김기택",
    displayName: "능률 김기택",
    course: "중2",
    grade: "중2",
    lessons: [
      { title: "L1. Together with Friends", passage: "What Kind of Friend Are You?", grammar: "수여동사 / 주격 관계대명사", functions: "계획 묻고 답하기 (What are you planning to do this Saturday?) / 약속 정하기 (What time should we meet?)", topicHint: "우정" },
      { title: "L2. The Joy of Helping", passage: "Warm Hearts for Our Community", grammar: "현재완료 / 비교급 / 최상급", functions: "도움 제안하기 (Can I help you?) / 감사 표현하고 답하기 (Thank you for helping me. / You’re welcome.)", topicHint: "봉사·나눔" },
      { title: "L3. Happy School Days", passage: "The School Heroes Awards", grammar: "to부정사 형용사적 / 접속사 if", functions: "희망·기대 (I’m looking forward to…) / 가능성 정도 (Maybe she will win first prize!)", topicHint: "학교생활" },
      { title: "L4. Always Stay Healthy", passage: "Sleep Matters for Teenagers", grammar: "so ~ that / 수동태", functions: "상태 묻기 (What’s wrong?) / 상기시키기 (Don’t forget to take the medicine on time.)", topicHint: "건강·수면" },
      { title: "SL1. The Bridge Riddle" },
      { title: "L5. We’re All Special", passage: "The Dot", grammar: "to부정사를 목적격 보어로 취하는 동사 / 목적격 관계대명사 that", functions: "능력 (Are you good at baking?) / 확신 (I’m sure you will create a fun game one day.)", topicHint: "예술·자존감 (The Dot)" },
      { title: "L6. Let’s Travel!", passage: "Let’s Travel! (추출본이 단원명과 동일 표기)", grammar: "지각동사 / 간접의문문", functions: "바람·소망 (I’d like to stay at a place by the ocean…) / 기원 (I hope you have a nice trip!)", topicHint: "여행" },
      { title: "L7. Buy, Sell, Share", passage: "My Day with the Sharing Economy", grammar: "사역동사 / 동등비교 as ~ as", functions: "선호 묻고 답하기 (Which do you prefer?) / 추천 요청 (Can you recommend one?)", topicHint: "공유경제·소비" },
      { title: "L8. Technology All Around Us", passage: "A Chat with an AI Chatbot", grammar: "가주어/진주어 It ~ to / 의문사+to부정사", functions: "알고 있는지 묻고 답하기 (Have you heard about smart chairs?) / 놀람 (I’m surprised that…)", topicHint: "기술·AI" },
      { title: "SL2. Fly Away Home" },
    ],
  },
  {
    id: "중-중1-ybm-박준언",
    displayName: "YBM 박준언",
    course: "중1",
    grade: "중1",
    lessons: [
      { title: "L1. All about Me", passage: "My Lifelogging", grammar: "be동사 현재 / 일반동사 현재", functions: "개인 정보 묻고 답하기 (What is your name?) / 좋아하는 것 (What subject do you like?)", topicHint: "나/라이프로깅" },
      { title: "L2. Have Fun at School", passage: "Fun School Events Around the World", grammar: "현재진행형 / 조동사 will·can", functions: "행동 묘사 (He is making a sandwich.) / 능력 유무 (Is she good at math?)", topicHint: "학교 행사" },
      { title: "L3. The Magic of Manners", passage: "The Power of Small Acts", grammar: "과거 시제 / 명령문", functions: "허가 (May I see your ticket?) / 금지 (Don’t leave your trash.)", topicHint: "예절" },
      { title: "L4. Home Sweet Home", passage: "My Family Tradition", grammar: "to부정사 명사적 / 접속사 when", functions: "도움 요청 (Can you cut the potatoes?) / 감사 (Thank you for the card.)", topicHint: "가족" },
      { title: "L5. Food Around the World", passage: "Ice Cream in the World", grammar: "비교급 / 감각동사", functions: "제안·권유 (Why don’t you try som tam?) / 의도 (I’m going to have a taco.)", topicHint: "세계 음식" },
      { title: "L6. Click, Connect, and Communicate", passage: "What Should I Do?", grammar: "동명사 / 4형식 수여동사", functions: "기분·상태 (I feel great.) / 기쁨·유감 (I’m happy/sorry to hear that.)", topicHint: "디지털 소통" },
      { title: "L7. Think Green, Live Green", passage: "We Look Funny but Taste Great!", grammar: "접속사 that / 감탄문", functions: "바람 (I’d like to buy this shampoo.) / 동의 (That’s good idea. 추출 표기)", topicHint: "환경·식품" },
      { title: "L8. A Journey with Arts", passage: "The Dot", grammar: "재귀대명사 / to부정사 부사적", topicHint: "예술 (The Dot)" },
    ],
  },
  {
    id: "중-중2-ybm-박준언",
    displayName: "YBM 박준언",
    course: "중2",
    grade: "중2",
    lessons: [
      { title: "L1. Know Me, Know You", passage: "Different but Together", grammar: "최상급 / to부정사 형용사적", functions: "좋아하는 것 (I enjoy exercising outside.) / 인물·성격 묘사 (She is active and friendly.)", topicHint: "다양성·우정" },
      { title: "L2. Healthy Bodies, Healthy Minds", passage: "How’s Your Neck Doing?", grammar: "접속사 if / 사역동사+O+동사원형", functions: "습관·일과 (I do a thousand jumps after lunch.) / 충고 (I think you should sleep more…)", topicHint: "건강" },
      { title: "L3. Meet the World", passage: "Unique Rules Around the World", grammar: "주격 관계대명사 / 의문사+to부정사", functions: "계획 (I’m planning to visit Paris.) / 상기 (Don’t forget to feed them.)", topicHint: "세계 문화·규칙" },
      { title: "L4. Data in Everyday Life", passage: "Data Saved Thousands of Lives", grammar: "비교급 강조 / 수동태", functions: "궁금증 (I’m curious about today’s weather.) / 놀람 (That’s surprising!)", topicHint: "데이터·나이팅게일" },
      { title: "L5. Find My Dream", passage: "A Journey to Find My Dream", grammar: "It+for O+to부정사 / 명령문 and/or", functions: "관심 (I’m interested in soccer.) / 기원 (I hope you become a kind and caring nurse.)", topicHint: "진로" },
      { title: "L6. Only One Earth", passage: "Living with Corals Again", grammar: "현재완료 / 접속사 although", functions: "알고 있음 (I heard that pens can’t be recycled.) / 이해 (I get it.)", topicHint: "환경·산호" },
      { title: "L7. A Better Community", passage: "Taxes Are All Around Us", grammar: "want/ask/advise+O+to부정사 / 목적격 관계대명사", functions: "의무 (We have to take good care of library books.) / 공감 (I agree with you!)", topicHint: "세금·공동체" },
      { title: "L8. Think in New Ways!", passage: "Creative Thinking Makes a Difference", grammar: "as ~ as / so ~ that", functions: "감탄 (How cool (it is)!) / 확실성 (I’m sure they’ll be useful to me.)", topicHint: "창의적 사고" },
    ],
  },
  {
    id: "중-중1-ybm-김은형",
    displayName: "YBM 김은형",
    course: "중1",
    grade: "중1",
    lessons: [
      { title: "L1. All About Me", passage: "Meet My Favorites", grammar: "be/일반동사 현재 긍정·부정", functions: "소개하기 (This is my friend, Somi.) / 좋아하는 것 (I like spicy food.)", topicHint: "나·취미" },
      { title: "L2. Think Wise, Stay Safe", passage: "Safety Quiz", grammar: "be/일반동사 의문문 / 현재진행형", functions: "행동 묘사 (I am looking at the plant.) / 경고 (Be careful. Don’t touch it.)", topicHint: "안전" },
      { title: "L3. Wonderful Stories from School", passage: "Thank You Notes on Air", grammar: "동사 과거 / 조동사 will", functions: "소감 (How was the game?) / 과거 경험 (We practiced dance moves.)", topicHint: "학교 이야기" },
      { title: "L4. Make a Difference in Our Community", passage: "Let’s Map Our Community", grammar: "동명사 / There is/are", functions: "관심 (What are you interested in?) / 제안 (How about joining our project?)", topicHint: "지역사회" },
      { title: "L5. Love Yourself, Live Your Life", passage: "The Cool Giraffe", grammar: "to부정사 명사적 / 재귀대명사", functions: "능력 (I’m good at playing basketball.) / 바람 (I want to be a basketball player.)", topicHint: "자존감 (우화)" },
      { title: "L6. A Smart Digital Life", passage: "Our Digital Footprints", grammar: "접속사 when / 조동사 should", functions: "걱정 (I’m worried about my homework.) / 조언 (You should clear the cookies.)", topicHint: "디지털 리터러시" },
      { title: "L7. Colorful Cultures Around the World", passage: "Talk Across Cultures", grammar: "비교급 / 최상급", functions: "위치 (Where is it?) / 비교 (The shoes are smaller than yours.)", topicHint: "세계 문화" },
      { title: "L8. Go Green, Save the Earth", passage: "A Green Life for the World", grammar: "수여동사 / to부정사 부사적", functions: "요청 (Can you give me a hand?) / 계획 (We are going to pick up trash.)", topicHint: "환경" },
    ],
  },
  {
    id: "중-중2-ybm-김은형",
    displayName: "YBM 김은형",
    course: "중2",
    grade: "중2",
    lessons: [
      { title: "L1. Our Day, Our Story", passage: "Sumin’s Daily Routine with Luna", grammar: "접속사 that / to부정사 형용사적", functions: "빈도 (How often does your club meet?) / 소망·바람 (I hope I can make my own robot dog.)", topicHint: "일과·반려동물" },
      { title: "L2. All About My Plate", passage: "Join Our Food Diary Project", grammar: "현재완료 / 비교급 강조", functions: "경험 (Have you ever tried Greek yogurt?) / 제안 (Why don’t you try having breakfast?)", topicHint: "식습관" },
      { title: "L3. Click Smart for a Safe Digital Life", passage: "The Curious Story of the Chocolate Menu", grammar: "주격 관계대명사 / need to", functions: "알고 있는지 (Did you hear about the changes at our school?) / 필요성 (We need to check the school website.)", topicHint: "디지털 안전·가짜뉴스" },
      { title: "L4. Journey Through Korean Culture", passage: "Vlog in Gangneung", grammar: "접속사 before/after / 수동태", functions: "선호 (Which do you prefer, hot soup or cold noodles?) / 희망·기대 (I’m excited to go to Busan next week!)", topicHint: "한국 문화·강릉" },
      { title: "L5. Better Words, Better Worlds", passage: "The Power of Words (ETTV 추출 ‘The of Power Words’ → 클래스카드 본문 제목 확인)", grammar: "사역동사 / 목적격 관계대명사", functions: "문제의 원인 (What’s the matter?) / 도움 제안 (Let me help you.)", topicHint: "언어·마음" },
      { title: "L6. Beyond the Earth", passage: "A Field Trip to the Moon", grammar: "접속사 if / It ~ to + 동사원형", functions: "놀람 (That’s surprising!) / 가능성 (Is it possible to see a supermoon?)", topicHint: "우주" },
      { title: "L7. Together for a Greener Tomorrow", passage: "The Baby Turtles’ Journey at Night", grammar: "분사 / 의문사+to부정사", functions: "의도 (I’m thinking of saving water.) / 방법 (Can you tell me how to reduce our carbon footprint?)", topicHint: "환경·바다거북" },
      { title: "L8. From Mysteries to Imagination", passage: "The Mystery of the Empty Safe", grammar: "간접의문문 / 지각동사", functions: "궁금증 (I’m curious about the answer.) / 알고 있는지 (Do you know what it is?)", topicHint: "추리/이야기" },
    ],
  },
  {
    id: "중-중1-천재-이상기",
    displayName: "천재 이상기",
    course: "중1",
    grade: "중1",
    lessons: [
      { title: "L1. Finding Me", passage: "I Am Cotton Candy!", grammar: "be동사 현재 / 일반동사 현재", topicHint: "자기소개" },
      { title: "L2. I Love My School", passage: "My School Tour", grammar: "현재진행형 / 의문문", topicHint: "학교" },
      { title: "L3. Let’s Go Green!", passage: "Save Coral Reefs", grammar: "명령문 / 조동사 can·will", topicHint: "환경·산호" },
      { title: "L4. Words of Wisdom", passage: "One Grain of Rice", grammar: "과거형 / 감탄문", topicHint: "설화/지혜" },
      { title: "L5. Walk into Korea", passage: "Garam’s Travel Diary to Tongyeong", grammar: "There is/are / 동명사", topicHint: "한국 여행·통영" },
      { title: "L6. The Beauty of Art", passage: "Pictures Talk About the Artist!", grammar: "접속사 that / to부정사 명사적", topicHint: "예술" },
      { title: "L7. Tasty World", passage: "Omelets Around the World", grammar: "감각동사 / 비교급", topicHint: "세계 음식" },
      { title: "L8. Living Together", passage: "Harry, the Hedgehog", grammar: "접속사 when / to부정사 부사적(목적)", topicHint: "이야기·공존" },
      { title: "SL. Into the Job World", topicHint: "진로" },
    ],
  },
  {
    id: "중-중2-천재-이상기",
    displayName: "천재 이상기",
    course: "중2",
    grade: "중2",
    lessons: [
      { title: "L1. Enjoy Your Days", passage: "Light Up Your Days with Special Hobbies", grammar: "수여동사 / -thing + 형용사", functions: "여가 활동 묻기 (What do you do in your free time?) / 빈도 (How often do you play basketball?)", topicHint: "취미" },
      { title: "L2. Living Healthy", passage: "Promise Me!", grammar: "접속사 because / 의문사+to부정사", functions: "걱정 (I’m worried about you.) / 당부 (Make sure you get enough sleep.)", topicHint: "건강" },
      { title: "L3. The World of Sports", passage: "Colors in Soccer (부제 The Uniform Colors)", grammar: "현재완료 / to부정사 형용사적", functions: "약속 정하기 (Can you make it at 1 p.m.?) / 거절 (Sorry, I can’t. I have a piano lesson.)", topicHint: "스포츠·축구" },
      { title: "L4. Animal Wonders", passage: "I Love Humpback Whales", grammar: "최상급 / want+O+to부정사", functions: "궁금증 (I’m so curious about it.) / 놀람 (That’s surprising!)", topicHint: "동물·고래" },
      { title: "L5. Be a Detective!", passage: "A Missing Cake", grammar: "주격 관계대명사 / 지각동사", functions: "묘사 (What does your dog look like?) / 유감 (I’m sorry to hear that.)", topicHint: "추리" },
      { title: "L6. Discovering Heroes", passage: "Exploring Greatness", grammar: "수동태 / so ~ that", functions: "관심 (I’m interested in space travel.) / 기원 (I hope your dream comes true.)", topicHint: "위인" },
      { title: "L7. Be a Smart Shopper", passage: "Secrets That Shoppers Must Know", grammar: "목적격 관계대명사 / 수량 형용사 (a few 등)", functions: "가격 (How much is this yellow backpack?) / 추천 요청 (Can you recommend a jacket…)", topicHint: "소비" },
      { title: "L8. Explore the Night Sky", passage: "Tales of the Big Dipper", grammar: "접속사 if / 가주어 it", functions: "알고 있는지 (Have you heard about the new movie?) / 기대 (I’m looking forward to it.)", topicHint: "별자리 설화" },
    ],
  },
  {
    id: "중-중1-천재-소영순",
    displayName: "천재 소영순",
    course: "중1",
    grade: "중1",
    lessons: [
      { title: "L1. New Start, New Friends", passage: "Mystery Bag", grammar: "be동사 / 일반동사", functions: "인사 (Hi, I’m Taeho. Nice to meet you.) / 좋아하는 것 (Do you like spaghetti?)", topicHint: "새 학기·친구" },
      { title: "L2. Happy School Days", passage: "Log in to School Club Activities", grammar: "현재진행형 / 조동사 will·can", functions: "잘 하는 것 (Are you good at English?) / 제안 (Why don’t you…)", topicHint: "동아리" },
      { title: "L3. Together with Animals", passage: "Animal Feelings", grammar: "의문사 의문문 / to부정사 명사적", functions: "도움 요청 (Can you help me?) / 외모 (What does she look like?)", topicHint: "동물" },
      { title: "L4. My Delicious Summer Trip", passage: "My Korean Food Diary", grammar: "과거 시제 / 동명사", functions: "음식 권하기 (Would you like some ice cream?) / 경험 (What did you eat?)", topicHint: "한국 음식·여행" },
      { title: "L5. Share Your Joys and Worries", passage: "Growing Season", grammar: "비교급 / 최상급", functions: "감정 (What’s the matter?) / 걱정 (I’m worried about…)", topicHint: "감정·성장" },
      { title: "L6. Heroes in Nature", passage: "Joys of Working in Nature", grammar: "to부정사 부사적 / 접속사 that", functions: "관심 (I’m interested in upcycling.) / 조언 (You should…)", topicHint: "자연·직업" },
      { title: "L7. Love for Art", passage: "Henri’s Scissors", grammar: "4형식 수여동사 / 접속사 when", functions: "제안에 동의 (Let’s… That’s a good idea.) / 의견 (What do you think of this painting?)", topicHint: "예술 (마티스)" },
      { title: "SL. Special Lesson", passage: "Three Goats and a Troll", topicHint: "설화/이야기" },
    ],
  },
  {
    id: "중-중2-천재-소영순",
    displayName: "천재 소영순",
    course: "중2",
    grade: "중2",
    lessons: [
      { title: "L1. New Year, New Me", passage: "Better Sleep, Better life (추출 표기 그대로)", grammar: "접속사 if / 의문사+to부정사", functions: "의도 (I’m planning to exercise more.) / 격려 (You can do it!)", topicHint: "신년 목표·수면" },
      { title: "L2. The Journey with My Family", passage: "Now One Foot, Now the Other", grammar: "to부정사 형용사적 / 주격 관계대명사", functions: "허가 요청 (Is it okay if I go to see a baseball game?) / 시간 (What time is it in London?)", topicHint: "가족 (그림책)" },
      { title: "L3. New Ideas Bring Big Changes", passage: "Wonderful Inventions by Chance", grammar: "수동태 / 접속사 although", functions: "설명 요청 (Could you explain more about it?) / 확실성 (I’m sure that…)", topicHint: "발명" },
      { title: "L4. Open the Doors to the World", passage: "Hula, More than Just a Dance", grammar: "현재완료 / so … that", functions: "반복 요청 (I beg your pardon?) / 장소 묘사 (New York is famous for Broadway musicals.)", topicHint: "세계 문화·훌라" },
      { title: "L5. From Your Interest to Future Jobs", passage: "Voices from the Sports Field", grammar: "make/keep+O+형용사 / 간접의문문", functions: "선호 (I prefer math to English.) / 동의·이의 (I agree with you.)", topicHint: "진로·스포츠" },
      { title: "L6. Use Smart, Live Safe", passage: "Happy Digital Laundry", grammar: "지각동사 see/hear/feel+O+-ing / want/tell/ask+O+to부정사", functions: "열거 (First, … Then, … Lastly, …) / 상기 (Don’t forget to prepare your bus card.)", topicHint: "디지털 안전" },
      { title: "L7. Natural Wonders", passage: "Wild Wonderlands", grammar: "사역동사 make/have/let+O+동사원형 / It … to부정사", functions: "놀람 (What a surprise!) / 알거나 모름 (Have you heard about a national park passport?)", topicHint: "국립공원·자연" },
      { title: "L8. The Magic of Giving", passage: "Sparrow Socks", grammar: "-thing + 형용사 / 목적격 관계대명사", functions: "도움 제안 (Can I give you a hand?) / 감사 (I really appreciate your help.)", topicHint: "나눔 (이야기)" },
    ],
  },
  {
    id: "중-중1-동아-윤정미",
    displayName: "동아 윤정미",
    course: "중1",
    grade: "중1",
    lessons: [
      { title: "L1. Happy Together", passage: "Who Is in Your Heart?", grammar: "be동사 / 일반동사", topicHint: "관계·마음" },
      { title: "L2. Eat, Play, and Live Well!", passage: "Healthy and Yummy Snacks for You", grammar: "현재진행형 / 조동사 can·will", topicHint: "건강 간식" },
      { title: "L3. Let’s Be Positive", passage: "Different Attitudes, Different Results", grammar: "동사 과거 / 명령문", topicHint: "태도·긍정" },
      { title: "L4. The Joy of Traveling", passage: "The Colorful Villages of the World", grammar: "동명사 / be going to", topicHint: "세계 마을·여행" },
      { title: "L5. Think like Sherlock Holmes!", passage: "Who Threw a Cake at the Monalisa?", grammar: "비교급·최상급 / There is/are", topicHint: "추리" },
      { title: "L6. Good for the Earth, Good for Us", passage: "Join the Zero-Waste Challenge", grammar: "to부정사 명사적 / 접속사 that", topicHint: "제로웨이스트" },
      { title: "L7. Find Your Dream", passage: "Let’s Make a Movie!", grammar: "to부정사 부사적 / when·before·after", topicHint: "진로·영화" },
      { title: "L8. Be Smart Online", passage: "Goldilocks Learns Her Lesson", grammar: "수여동사(4형식) / 비인칭 it", topicHint: "온라인·이야기" },
    ],
  },
  {
    id: "중-중2-동아-윤정미",
    displayName: "동아 윤정미",
    course: "중2",
    grade: "중2",
    lessons: [
      { title: "L1. The Future Is in Our Hands", passage: "Live Freely and Happily Ever After!", grammar: "to부정사 형용사적 / make+O+형용사", topicHint: "미래·NGO" },
      { title: "L2. How Teens Talk Now", passage: "Text Better, Communicate Better!", grammar: "간접의문문 / 5형식 (V+O+to-v)", topicHint: "문자 매너" },
      { title: "L3. What a Great Idea!", passage: "Necessity Is the Mother of Invention", grammar: "수동태 / have to", topicHint: "발명사" },
      { title: "L4. Are You Money Smart?", passage: "Be a Smart Shopper", grammar: "주격 관계대명사 / 접속사 if", topicHint: "소비·마케팅" },
      { title: "L5. The City as a Canvas", passage: "Street Art in London", grammar: "목적격 관계대명사 / used to + 동사원형", topicHint: "거리 예술" },
      { title: "L6. The Greatest Love for All", passage: "Dr. Schofield, a Foreigner Who Loved Korea", grammar: "지각동사 / so ~ that", topicHint: "인물·한국사" },
      { title: "L7. Let’s Enjoy Festivals", passage: "Seasonal Festivals Around the World", grammar: "It ~ to부정사 (가주어) / Call A B (5형식)", topicHint: "세계 축제" },
      { title: "L8. Time Travel", passage: "A Butterfly That Changed the Future", grammar: "현재완료 / thing + 형용사", topicHint: "시간여행 이야기" },
    ],
  },
  {
    id: "중-중1-동아-이병민",
    displayName: "동아 이병민",
    course: "중1",
    grade: "중1",
    lessons: [
      { title: "L1. New School, New Friends", passage: "What’s in Your School Bag?", grammar: "be동사 / 일반동사", topicHint: "새 학교" },
      { title: "L2. Be Healthy, Be Happy", passage: "Dr. AI, Help!", grammar: "의문문 / 명령문", topicHint: "건강" },
      { title: "L3. When I Grow Up", passage: "Hidden Heros (추출 철자 그대로)", grammar: "조동사 can·will / 현재진행형", topicHint: "진로·영웅" },
      { title: "L4. Living Together", passage: "My Neighbor, Elephants", grammar: "과거시제 / There is/are", topicHint: "공존·코끼리" },
      { title: "L5. Have a Special Day!", passage: "Fun in Sokcho!", grammar: "to부정사 목적어 / 비인칭 주어", topicHint: "속초·여행" },
      { title: "L6. Taste the World", passage: "Food Around the World", grammar: "감각동사+형용사 / 동명사", topicHint: "세계 음식" },
      { title: "L7. Think Big, Be Creative!", passage: "Faces of Great Artists", grammar: "비교급 / 접속사 when", topicHint: "예술가" },
      { title: "L8. Winter Is Coming!", passage: "Frindle", grammar: "수여동사 / 접속사 that", topicHint: "문학 (Frindle)" },
      { title: "SL. Let’s Build a Strong Bridge!" },
    ],
  },
  {
    id: "중-중2-동아-이병민",
    displayName: "동아 이병민",
    course: "중2",
    grade: "중2",
    lessons: [
      { title: "L1. Kick Off the New Year", passage: "Have a Good Talk!", grammar: "to부정사 형용사적 / 최상급", functions: "선호 (Which sport do you like best?) / 제안 (Why don’t we play together?)", topicHint: "대화·신년" },
      { title: "L2. What’s Your Story?", passage: "The Family Puzzle", grammar: "접속사 if / 수동태", functions: "추천 요청 (Can you recommend a book for me?) / 만족하는 점 (What do you like about it?)", topicHint: "가족 이야기" },
      { title: "L3. Hide and Seek", passage: "Can You Spot Them?", grammar: "주격 관계대명사 / 5형식 (keep+O+형용사)", functions: "외모 묘사 (What does your best friend look like?) / 성격 (What is she like?)", topicHint: "위장·동물" },
      { title: "L4. New Places and Friends", passage: "See You in London!", grammar: "현재완료 / ask/tell/want+O+to부정사", functions: "길 묻기 (How can I get to the museum?) / 소요시간 (How long will it take…)", topicHint: "런던 여행" },
      { title: "L5. Love, Act, Save!", passage: "Save the City on the Water", grammar: "가주어/진주어 / the+비교급 ~ the+비교급", functions: "방법 (What can I do to reduce plastic waste?) / 상기 (Don’t forget to carry a reusable bottle.)", topicHint: "환경·베네치아" },
      { title: "L6. Growing Teens", passage: "Voice of Teens", grammar: "each/every + 단수동사 / 지각동사", functions: "빈도 (How often do you take a walk?) / 강조 (It’s important to exercise.)", topicHint: "청소년" },
      { title: "L7. Wonders in Words", passage: "Stories Behind Idioms", grammar: "목적격 관계대명사 / 접속사 although", functions: "반복 요청 (What did you say?) / 설명 요청 (Can you tell me more about it?)", topicHint: "관용구" },
      { title: "L8. Festival Fun", passage: "The Quebec Winter Carnival", grammar: "의문사+to부정사 / so ~ that", functions: "경험 (Have you ever gone camping before?) / 기대 (I’m looking forward to it.)", topicHint: "축제" },
    ],
  },
  {
    id: "중-중1-미래엔-문영인",
    displayName: "미래엔 문영인",
    course: "중1",
    grade: "중1",
    lessons: [
      { title: "U1. Are You Ready?", passage: "What’s in Your School Survival Kit?", grammar: "be동사 / 일반동사", topicHint: "학교 적응" },
      { title: "U2. My Happy Life", passage: "Then and Now", grammar: "현재진행형 / There is/are", topicHint: "일상 변화" },
      { title: "U3. Be Open to Differences", passage: "We Have a Cat on Our Team!", grammar: "과거시제 / 조동사 can", topicHint: "다양성" },
      { title: "U4. Let’s Travel Together!", passage: "Plan B Was Great, Too!", grammar: "동명사 / 조동사 will", topicHint: "여행" },
      { title: "U5. Think Green, Live Green", passage: "Small Actions, Big Change", grammar: "4형식 수여동사 / 조동사 should", topicHint: "환경" },
      { title: "U6. Dear Future Me", passage: "Who Do I Want to Be?", grammar: "to부정사 명사적 / 접속사 when", topicHint: "진로·미래" },
      { title: "U7. You Know What?", passage: "Amazing Facts About the World", grammar: "비교급 / 최상급", functions: "퀴즈쇼 형식 본문 (추출)", topicHint: "세계 사실 퀴즈" },
      { title: "SR1. Special Reading 1" },
      { title: "SR2. Special Reading 2" },
    ],
  },
  {
    id: "중-중2-미래엔-문영인",
    displayName: "미래엔 문영인",
    course: "중2",
    grade: "중2",
    lessons: [
      { title: "U1. Your Answers Here", passage: "Looking for Advice", grammar: "주격 관계대명사 / ~thing+형용사", functions: "조언 (What should I do?) / 기원 (I hope you get better.)", topicHint: "고민 상담" },
      { title: "U2. Let’s Taste the World", passage: "Food Brings the World Together", grammar: "목적격 관계대명사 / 목적 to부정사", functions: "사실 확인 (Is that true?) / 정보 수정 (I’m afraid that’s not right.)", topicHint: "세계 음식" },
      { title: "U3. An Eye for Art", passage: "Manet and Monet", grammar: "수동태 / 접속사 if", functions: "선호 (Which is better…) / 이유 (Why do you think so?)", topicHint: "미술" },
      { title: "U4. Healthy, Smart Life", passage: "Do you Have Popcorn Brain?", grammar: "ask/want/tell/advise+O+to부정사 / It ~ to부정사", functions: "허락 (Is it okay to…) / 당부 (Make sure you…)", topicHint: "디지털 건강" },
      { title: "U5. Discover Korea", passage: "My Hometown, Chuncheon", grammar: "형용사적 to부정사 / 현재완료", functions: "경험 (Have you ever…) / 소감 (How did you like it?)", topicHint: "춘천·한국" },
      { title: "U6. Ready, Set, Go!", passage: "My First Skateboarding Lesson", grammar: "지각동사 / 사역동사", functions: "능력 (Do you know how to…) / 절차 (First, Next…)", topicHint: "스포츠" },
      { title: "U7. Amazing Animals", passage: "Animals in Cold Places", grammar: "so~that / 명사 수식 분사", functions: "외모 (What does Bella look like?) / 정보 요청 (Please tell me more.)", topicHint: "극지 동물" },
      { title: "U8. Clever Spending", passage: "Comparing Prices", grammar: "간접의문문 / 의문사+to부정사", functions: "불만 (I’m not happy with the delivery.) / 요청 (I’d like to cancel the order.)", topicHint: "소비" },
      { title: "SR. Special Reading", passage: "Where Is My Home?" },
    ],
  },
  {
    id: "중-중1-비상-황종배",
    displayName: "비상 황종배",
    course: "중1",
    grade: "중1",
    lessons: [
      { title: "L1. Ready for a New Start", passage: "Our First Day of School", grammar: "be동사 / 일반동사", functions: "소개 (Hi, I’m Minho.) / 좋아하는 것 (I like orange juice.)", topicHint: "새 학기" },
      { title: "L2. Happy with My Family", passage: "Happy Birthday, My Great-Grandma", grammar: "There is/are / 현재진행형", functions: "습관 (I usually get up at 6.) / 행동 묘사 (She’s baking cookies.)", topicHint: "가족" },
      { title: "L3. Love All Life", passage: "Tommy, My Hero", grammar: "be/일반동사 과거", functions: "생김새 (What does your dog look like?) / 놀람 (That’s surprising.)", topicHint: "반려동물" },
      { title: "L4. Everyday Art", passage: "Everything Can Be Art!", grammar: "수여동사 / 조동사 will·can", functions: "물건 사기 (How much is…) / 규칙 (Please leave your bag…)", topicHint: "생활 예술" },
      { title: "L5. Meet the New World", passage: "Give LIKEs to Our Game", grammar: "동명사 / 감각동사", functions: "관심 (I’m interested in robots.) / 장래 (I want to be a game maker.)", topicHint: "진로·게임" },
      { title: "L6. Walk Around the World", passage: "My Summer Days in Alaska", grammar: "접속사 when / 비교급", functions: "길 묻기 (Where is the toy store?) / 계획 (What are you going to do…)", topicHint: "여행·알래스카" },
      { title: "L7. Greener, Greater", passage: "What a Lucky Ducky!", grammar: "to부정사 명사적 / 감탄문", functions: "걱정 (I’m worried about the sea animals.) / 제안 (Why don’t we…)", topicHint: "환경" },
      { title: "L8. For a Better Tomorrow", passage: "Trust String (Andy’s Story / Junha’s Story — 마라톤)", grammar: "to부정사 부사적 / 접속사 that", functions: "Everyday Communication 1·2 (전문 미추출)", topicHint: "마라톤·도전" },
    ],
  },
  {
    id: "중-중2-비상-황종배",
    displayName: "비상 황종배",
    course: "중2",
    grade: "중2",
    lessons: [
      { title: "L1. Inside My World", passage: "My Bag, My School Life", grammar: "최상급 / V+O+형용사", functions: "가장 좋아하는 것 (Which flavor do you like the most?) / 만족 (How do you like it?)", topicHint: "학교생활" },
      { title: "L2. All in It Together", passage: "Where’s the Class Pet?", grammar: "주격 관계대명사 / V+O+to부정사", functions: "증상·상태 (What’s wrong? / I have a headache.) / 충고 (I think you should use a planner.)", topicHint: "학급·배려" },
      { title: "L3. That’s Creative!", passage: "Creative Minds of Teens", grammar: "현재완료 / 수동태", functions: "물건의 용도 (What is it for?) / 계획 (I’m planning to throw a party.)", topicHint: "창의성" },
      { title: "L4. Hard Times, Big Wins", passage: "Great Failure", grammar: "사역동사 / to부정사 형용사적", functions: "격려 (You’ll do better next time.) / 알고 있는지 (Have you heard of Edmund Hillary?)", topicHint: "실패·도전" },
      { title: "L5. Finding the Best in Life", passage: "The Pea Blossom", grammar: "원급 비교 as~as / 목적격 관계대명사", functions: "기대 (I’m looking forward to the school trip.) / 추천 (Can you recommend a gift?)", topicHint: "안데르센 이야기" },
      { title: "L6. How Things Work", passage: "Science Is the Key", grammar: "접속사 if / 지각동사", functions: "의무 (You have to wear safety glasses first.) / 궁금증 (I’m really curious about the moon.)", topicHint: "과학" },
      { title: "L7. A Taste of the World", passage: "Food Brings Us Together", grammar: "so ~ that / 가주어 it", functions: "경험 (Have you climbed Hallasan?) / 음식 권하기 (Would you like some?)", topicHint: "세계 음식" },
      { title: "L8. New Challenges Ahead", passage: "The Last Wild Race", grammar: "not only ~ but also / 간접의문문", functions: "해야 할 일 (Don’t forget to bring balloons.) / 허가 (Is it okay to borrow your jump rope?)", topicHint: "도전·레이스" },
    ],
  },
  {
    id: "중-중1-지학사-송미정",
    displayName: "지학사 송미정",
    course: "중1",
    grade: "중1",
    lessons: [
      { title: "L1. New Start, New Friends", passage: "I Follow My New Friends", grammar: "be동사 / 일반동사", topicHint: "새 친구" },
      { title: "L2. Play, Learn, and Grow Together", passage: "Sports Clubs Around the World", grammar: "현재진행형 / There is/are", topicHint: "스포츠 클럽" },
      { title: "L3. What’s on Your Plate?", passage: "Grandma’s Secret Recipe", grammar: "조동사 can / 감각동사", topicHint: "음식·레시피" },
      { title: "L4. Happy Together", passage: "Half and Half", grammar: "과거시제 / 미래시제 will", topicHint: "가족·이야기" },
      { title: "L5. Enjoy Every Corner of Korea", passage: "My Trip to Ganghwado", grammar: "비교급·최상급 / 접속사 that", topicHint: "강화도 여행" },
      { title: "L6. Green Heroes", passage: "Trees for Goals", grammar: "to부정사 명사적 / 동명사", topicHint: "환경·나무" },
      { title: "L7. Amazing Animals", passage: "Why Do Animals Travel?", grammar: "to부정사 부사적 / 접속사 when", topicHint: "동물 이동" },
      { title: "L8. When We Grow Up", passage: "Behind Movie Sounds", grammar: "접속사 because / have to", topicHint: "진로·영화 음향" },
    ],
  },
  {
    id: "중-중2-지학사-송미정",
    displayName: "지학사 송미정",
    course: "중2",
    grade: "중2",
    lessons: [
      { title: "L1. My Favorite Things", passage: "What Makes You Happy?", grammar: "make+O+형용사 / to부정사 형용사적", functions: "관심 (What are you interested in these days?) / 기대 (I can’t wait to join the party!)", topicHint: "취미·행복" },
      { title: "L2. Stay Safe", passage: "Let’s Learn First Aid", grammar: "접속사 if / 주격 관계대명사", functions: "일어난 일 (What happened to your forehead?) / 당부 (Make sure you wear a helmet.)", topicHint: "응급처치" },
      { title: "L3. Unique Festivals Around the World", passage: "Festivals for Our Animal Friends", grammar: "현재완료 / 수여동사", functions: "경험 (Have you ever been to this festival before?) / 날씨 (What’s the weather like this Saturday?)", topicHint: "동물 축제" },
      { title: "L4. Robots Are Coming!", passage: "I, Robot Robbie", grammar: "사역동사+O+동사원형 / so+형용사+that", functions: "기능 (What kind of work does it do?) / 의견 (How do you feel about the robots?)", topicHint: "로봇 (이야기)" },
      { title: "L5. Hit the Road", passage: "Living for a Month in New York City", grammar: "지각동사+O+현재분사 / 목적격 관계대명사", functions: "추천 부탁 (Could you recommend some Thai food…) / 길 묻기 (How do I get to the nearest subway station?)", topicHint: "뉴욕 여행" },
      { title: "L6. The Curious Garden", passage: "Potatoes: Once an Unpopular Vegetable", grammar: "수동태 / V+O+to부정사", functions: "부탁 (Can you do me a favor?) / 수락·거절 (Sure, no problem. / I’m sorry, but I can’t.)", topicHint: "감자·역사 (단원명 The Curious Garden)" },
      { title: "L7. The Beauty of Buildings", passage: "A Second Life for Old Buildings", grammar: "접속사 while / not only ~ but also", functions: "외양 (What does it look like?) / 추가 정보 (Can you tell me more about the hotel?)", topicHint: "건축 재생" },
      { title: "L8. Let’s Find a Solution!", passage: "The Five Whys", grammar: "접속사 since / 간접의문문", functions: "걱정 (I’m worried about safety in the park.) / 확신 (I’m sure it will be helpful.)", topicHint: "문제 해결" },
    ],
  },
  {
    id: "고-공통영어1-ne능률-민병천",
    displayName: "NE능률 민병천",
    course: "공통영어1",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Getting to Know Yourself", passage: "Don’t Let Anger Be Your Boss", topicHint: "자기 이해(단원명)" },
      { title: "Lesson 2. Caring Hearts", passage: "Turning Ideas into Reality", topicHint: "배려·돌봄(단원명)" },
      { title: "Special Lesson 1. The True Treasure", passage: "The Golden Windows", topicHint: "가치(단원명)" },
      { title: "Lesson 3. How Our Body Works", passage: "Timing is Everything", topicHint: "인체·과학(단원명)" },
      { title: "Lesson 4. The Future Ahead of Us", passage: "AI: Opportunity or Threat?", topicHint: "미래·AI(단원명)" },
      { title: "Special Lesson 2. Ready to Be Wicked", passage: "A Journey into a Magical World", topicHint: "문학/서사(단원명)" },
    ],
  },
  {
    id: "고-공통영어1-ne능률-오선영",
    displayName: "NE능률 오선영",
    course: "공통영어1",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. A Journey into Yourself", passage: "Discovering Yourself through Challenges", topicHint: "자기 이해(단원명)" },
      { title: "Lesson 2. Health Matters!", passage: "Talk It Out, Help Is Here", topicHint: "건강(단원명)" },
      { title: "Lesson 3. Nature & Us", passage: "Letters to Nature", topicHint: "자연(단원명)" },
      { title: "Lesson 4. The Winds of Change", passage: "Pictures Worth a Thousand Words", topicHint: "변화(단원명)" },
      { title: "Special Lesson. Two Thanksgiving Day Gentlemen", passage: "Two Thanksgiving Day Gentlemen", topicHint: "문학" },
    ],
  },
  {
    id: "고-공통영어1-ybm-김은형",
    displayName: "YBM 김은형",
    course: "공통영어1",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Believe That You Can Do Better", passage: "The Magic of Believing That You Can Grow", topicHint: "성장 마인드(단원명)" },
      { title: "Lesson 2. Art and the City", passage: "Arles, the City of Light and Art", topicHint: "도시·예술(단원명)" },
      { title: "Lesson 3. Living Green: A Guide to Sustainable Choices", passage: "Why Fashion Needs to Be More Sustainable", topicHint: "지속가능 패션(본문제목)" },
      { title: "Lesson 4. Be Smart in the Digital World", passage: "Fake or Fact, That Is the Question", topicHint: "디지털 리터러시(단원명)" },
      { title: "Project 1. Digital Devices and Physical Health", topicHint: "디지털 기기와 건강" },
      { title: "Project 2. Cooking and Eating for the Planet", topicHint: "지구를 위한 식생활" },
    ],
  },
  {
    id: "고-공통영어1-ybm-박준언",
    displayName: "YBM 박준언",
    course: "공통영어1",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Enrich Your Life", passage: "The Magic of Morning Pages / extra: Tips for Making a Habit Stick", topicHint: "습관·자기계발(단원명)" },
      { title: "Lesson 2. Explore Wildlife Wonders", passage: "The Mind of an Octopus / extra: The Cambridge Declaration of Consciousness", topicHint: "야생동물(단원명)" },
      { title: "Lesson 3. Embrace Diversity, Broaden Your Horizons", passage: "English or Englishes? / extra: Living Dictionary", topicHint: "언어·다양성(단원명)" },
      { title: "Lesson 4. When Art Meets Technology", passage: "Artificial Intelligence and the Arts / extra: Who Is the Author of AI-generated Art?", topicHint: "예술·AI(단원명)" },
    ],
  },
  {
    id: "고-공통영어1-동아출판-이병민",
    displayName: "동아출판 이병민",
    course: "공통영어1",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Life Is Experience", passage: "When Were You Bravest?", topicHint: "경험·용기(단원명)" },
      { title: "Lesson 2. Journey Through the Pages", passage: "Great Opening Lines", topicHint: "독서(단원명)" },
      { title: "Lesson 3. Small Things Matter", passage: "Wishful Recycling", topicHint: "재활용(본문제목)" },
      { title: "Lesson 4. Everyday Decisions", passage: "Why You Buy What You Buy", topicHint: "소비 결정(본문제목)" },
      { title: "Special Lesson. Eureka! An Idea Is Born", passage: "Eureka! An Idea Is Born", topicHint: "아이디어(단원명)" },
    ],
  },
  {
    id: "고-공통영어1-미래엔-김성연",
    displayName: "미래엔 김성연",
    course: "공통영어1",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. You and I Become “We”", passage: "The Power of Friendliness: Soft but Strong", topicHint: "우정·협력(단원명)" },
      { title: "Lesson 2. Open a Book, Open the World", passage: "Gathering of the Whakapapa", topicHint: "문학(단원명)" },
      { title: "Lesson 3. Free Yourself with Science", passage: "Tuning Out: The Science of Noise-Cancellation", topicHint: "과학(단원명)" },
      { title: "Lesson 4. Let It Be Green", passage: "A Better Future for Coffee Waste", topicHint: "환경·업사이클(본문제목)" },
    ],
  },
  {
    id: "고-공통영어1-비상교육-홍민표",
    displayName: "비상교육 홍민표",
    course: "공통영어1",
    grade: "고1",
    lessons: [
      { title: "Unit 1. My Life", passage: "Letters from Recent Graduates / extra: Whose Side Are You on?", topicHint: "삶·진로(단원명)" },
      { title: "Unit 2. Tasty Journeys", passage: "Odd Pairings That Work / extra: The World of Curries", topicHint: "음식(단원명)" },
      { title: "Unit 3. Nature Connections", passage: "My Octopus Teacher / extra: Keep Trying and Keep Hoping", topicHint: "자연(단원명)" },
      { title: "Unit 4. A Sunshine Break", passage: "Wheels of Adventures / extra: Festivals Around the World", topicHint: "여행·여가(단원명)" },
    ],
  },
  {
    id: "고-공통영어1-지학사-신상근",
    displayName: "지학사 신상근",
    course: "공통영어1",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Hi, High School", passage: "Getting Off to a Good Start / extra: Popular Extracurricular Activities Around the World", grammar: "Language Forms 예시문 — one of the most important decisions; writing … will allow you to … (문법 항목명 공식 표기 없음)", functions: "관심 표현하기 (I’m interested in acting.) / 계획 표현하기 (I’m planning to read a book every month.)", topicHint: "학교생활 (교과서 Contents)" },
      { title: "Lesson 2. Make Your Conversation Colorful", passage: "It’s All Greek to Me / extra: Unique Idioms Around the World", grammar: "Language Forms 예시문 — … the Trojan War, where Achilles … / so complex that … (문법 항목명 공식 표기 없음)", functions: "정의하기 (It means “I love eating sweets.”) / 반복 요청하기 (Can you say that again?)", topicHint: "언어와 생활 (교과서 Contents)" },
      { title: "Lesson 3. Oh, Happy Days!", passage: "The Chemistry of Happiness / extra: You Can Make Yourself Happy: Synthetic Happiness vs. Natural Happiness", grammar: "Language Forms 예시문 — make you feel better / tryptophan, which must enter … (문법 항목명 공식 표기 없음)", functions: "기쁨 표현하기 (I feel so happy.) / 제안·권유하기 (Why don’t you exercise regularly?)", topicHint: "건강과 행복 (교과서 Contents)" },
      { title: "Lesson 4. Hit the Road!", passage: "London Delights / extra: The History of Afternoon Tea", grammar: "Language Forms 예시문 — Walking around the area …, I saw … / What I liked the most … (문법 항목명 공식 표기 없음)", functions: "선호 표현하기 (Do you prefer the beach or the mountains?) / 희망·기대 표현하기 (I can’t wait!)", topicHint: "여행 (교과서 Contents)" },
    ],
  },
  {
    id: "고-공통영어1-천재교과서-강상구",
    displayName: "천재교과서 강상구",
    course: "공통영어1",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Speaking in Public", passage: "Logan’s Speech", topicHint: "발표(단원명)" },
      { title: "Lesson 2. Our Community, Our Lives", passage: "Mapping Our Voices", topicHint: "공동체(단원명)" },
      { title: "Lesson 3. Journey into Another Culture", passage: "A Trip to the Netherlands", topicHint: "문화 교류(단원명)" },
      { title: "Lesson 4. Painting Our World Greener", passage: "Art & Our Environment", topicHint: "환경·예술(단원명)" },
    ],
  },
  {
    id: "고-공통영어1-천재교과서-조수경",
    displayName: "천재교과서 조수경",
    course: "공통영어1",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. For a Better School Life", passage: "Understanding Your Behavior / extra: Eiffel Tower Effect", topicHint: "학교생활(단원명)" },
      { title: "Lesson 2. Passion for Fashion", passage: "How Fashion Items Got Their Names / extra: What Is Your Personal Color?", topicHint: "패션(단원명)" },
      { title: "Lesson 3. The Power of Helping Others", passage: "A Korean Chief in Nigeria / extra: UNESCO King Sejong Literacy Prize", topicHint: "나눔(단원명)" },
      { title: "Lesson 4. Only One Earth", passage: "Save Coral Reefs / extra: Let’s Celebrate Marine Gardening Day!", topicHint: "해양·환경(본문제목)" },
    ],
  },
  {
    id: "고-공통영어2-ne능률-민병천",
    displayName: "NE능률 민병천",
    course: "공통영어2",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Bonding with Others", passage: "BREAKING NEWS — An Unusual Rescue Effort", topicHint: "유대(단원명)" },
      { title: "Lesson 2. What Keeps Us Moving Forward", passage: "A Creative Idea Sparks a Whole New Field", topicHint: "창의·진보(단원명)" },
      { title: "Special Lesson 1. Exploring Our Natural World", passage: "A Wonder under the Waves", topicHint: "자연(단원명)" },
      { title: "Lesson 3. Knowing Ourselves, Knowing Others", passage: "A Timeless Symbol of Korea", topicHint: "한국 문화 상징(본문제목)" },
      { title: "Lesson 4. Toward Sustainability", passage: "Looking to Nature for Help", topicHint: "지속가능성(단원명)" },
      { title: "Special Lesson 2. One-of-a-Kind Self", passage: "Finding What Defines Us", topicHint: "정체성(단원명)" },
    ],
  },
  {
    id: "고-공통영어2-ne능률-오선영",
    displayName: "NE능률 오선영",
    course: "공통영어2",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Embrace Connections", passage: "A Band United by a Name", topicHint: "관계(단원명)" },
      { title: "Lesson 2. From Problems to Solutions", passage: "Bringing New Life to Old Cities", topicHint: "도시 재생(본문제목)" },
      { title: "Lesson 3. Our Heritage, Our Treasure", passage: "Rescuing Cultural Treasures", topicHint: "문화유산(단원명)" },
      { title: "Lesson 4. Good for All of Us", passage: "Opening Up the Web to Everyone", topicHint: "웹 접근성(본문제목)" },
      { title: "Special Lesson. Behind the Scenes", passage: "Behind the Scenes", topicHint: "비하인드(단원명)" },
    ],
  },
  {
    id: "고-공통영어2-ybm-김은형",
    displayName: "YBM 김은형",
    course: "공통영어2",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Make Your World a Better Place", passage: "Young Change-Makers Shaping the Future", topicHint: "사회 변화(단원명)" },
      { title: "Lesson 2. From Tradition to Trend", passage: "K-Delivery, Speedy and Reliable", topicHint: "전통과 트렌드(단원명)" },
      { title: "Project 1. Community Mapping", topicHint: "커뮤니티 매핑" },
      { title: "Lesson 3. Beyond Barriers", passage: "Katherine Johnson, a “Computer” Who Looked Beyond Numbers", topicHint: "편견·장벽(단원명)" },
      { title: "Lesson 4. The Essence of Being Human", passage: "Klara and the Sun", topicHint: "인간성(단원명)" },
      { title: "Project 2. Wild Animal Protection", topicHint: "야생동물 보호" },
    ],
  },
  {
    id: "고-공통영어2-ybm-박준언",
    displayName: "YBM 박준언",
    course: "공통영어2",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Be Digitally Smart!", passage: "Warning: Fake News Alert! / extra: Breaking Out of the Echo Chamber", topicHint: "가짜뉴스(본문제목)" },
      { title: "Lesson 2. Urgent Call From Earth", passage: "Dry / extra: Hunger Stones", topicHint: "환경 위기(단원명)" },
      { title: "Lesson 3. Rise Above Challenges", passage: "Resilience: The Power to Overcome / extra: Growth Mindset", topicHint: "회복탄력성(본문제목)" },
      { title: "Lesson 4. Creative Ideas for a Better Word", passage: "Science for All / extra: Helping Hands", topicHint: "과학·포용(본문제목)" },
    ],
  },
  {
    id: "고-공통영어2-동아출판-이병민",
    displayName: "동아출판 이병민",
    course: "공통영어2",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Love Yourself", passage: "Are You a Good Eater?", topicHint: "자기 돌봄(단원명)" },
      { title: "Lesson 2. Beyond Borders", passage: "A Summer to Remember", topicHint: "세계시민(단원명)" },
      { title: "Lesson 3. Into the Smart Future", passage: "Social Media Algorithms: A Double-edged Sword", topicHint: "알고리즘(본문제목)" },
      { title: "Lesson 4. Explore the World of Art", passage: "Rediscovering Art Through Science", topicHint: "예술·과학(본문제목)" },
    ],
  },
  {
    id: "고-공통영어2-미래엔-김성연",
    displayName: "미래엔 김성연",
    course: "공통영어2",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. We Share, We Care", passage: "Volunteering at an Animal Sanctuary", topicHint: "동물 보호·봉사(본문제목)" },
      { title: "Lesson 2. Be a Wise Consumer", passage: "Light Up Dark Patterns", topicHint: "다크패턴·소비(본문제목)" },
      { title: "Lesson 3. The True Art Lovers", passage: "From Shadows to Spotlights", topicHint: "예술(단원명)" },
      { title: "Lesson 4. Sink or Swim in the Digital Ocean", passage: "Will AI-Powered Neural Implants Make Us Super-Humans?", topicHint: "신경 임플란트·AI(본문제목)" },
    ],
  },
  {
    id: "고-공통영어2-비상교육-홍민표",
    displayName: "비상교육 홍민표",
    course: "공통영어2",
    grade: "고1",
    lessons: [
      { title: "Unit 1. The Road Ahead", passage: "Start Connecting Your Dots Today", topicHint: "진로(단원명)" },
      { title: "Unit 2. My Culture, Your Culture", passage: "K-Culture and Beyond", topicHint: "문화(단원명)" },
      { title: "Unit 3. The Gift of Art", passage: "Colorful Stories of Art", topicHint: "예술(단원명)" },
      { title: "Unit 4. New Challenges", passage: "Space: The Final Frontier", topicHint: "우주(본문제목)" },
    ],
  },
  {
    id: "고-공통영어2-지학사-신상근",
    displayName: "지학사 신상근",
    course: "공통영어2",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Shall We Dance?", passage: "Dancing on the Street / extra: Folk Dances Around the World", grammar: "Language Forms 예시문 — has been growing / involves interactions with … (문법 항목명 공식 표기 없음)", functions: "알거나 모르고 있음 묻기 (Have you heard of the Haka?) / 바람·소원 표현하기 (I’m looking forward to watching your performance.)", topicHint: "여가, 개인 생활 (교과서 Contents)" },
      { title: "Lesson 2. The Wonders of Korea", passage: "Ondol: Lasting Warmth / extra: Presenting the Beauty of Korea", grammar: "Language Forms 예시문 — You may have experienced … / not only … but also … (문법 항목명 공식 표기 없음)", functions: "궁금증 표현하기 (I’m curious about traditional Korean music.) / 충고하거나 구하기 (Can you give me some advice?)", topicHint: "우리 문화 (교과서 Contents)" },
      { title: "Lesson 3. Towards a Greener Tomorrow", passage: "Rising Seas, Sinking Cities / extra: Ways to Be Heroes for the Environment", grammar: "Language Forms 예시문 — has been progressing … / will have disappeared … by the end of this century (문법 항목명 공식 표기 없음)", functions: "걱정·두려움 표현하기 (I’m so worried.) / 의무 표현하기 (We should throw away old medicines in a proper way.)", topicHint: "자연 환경 (교과서 Contents)" },
      { title: "Lesson 4. The Late Bloomers", passage: "Grandma Moses: Life Is What You Make It / extra: Naive Art and Artists", grammar: "Language Forms 예시문 — widely known as … / with visitors arriving and leaving … (문법 항목명 공식 표기 없음)", functions: "능력 칭찬하기 (You’re good at singing.) / 놀람 표현하기 (That’s quite surprising!)", topicHint: "인물, 예술 (교과서 Contents)" },
    ],
  },
  {
    id: "고-공통영어2-천재교과서-강상구",
    displayName: "천재교과서 강상구",
    course: "공통영어2",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Tiny and Mighty", passage: "The Mosquito: The Worst Bug on the Planet? / extra: Ladybugs / Earthworms", topicHint: "작은 생물(단원명)" },
      { title: "Lesson 2. Humans and Technology", passage: "Teen-Designed Tech for Improving Access / extra: Self-Driving Cars", topicHint: "기술·접근성(본문제목)" },
      { title: "Lesson 3. The World of Tastes", passage: "Love This? Hate That? Polarizing Foods / extra: The Power of Food as a Tool of Peace", topicHint: "음식(단원명)" },
      { title: "Lesson 4. Cherishing the Past", passage: "Still Standing / extra: 미확인", topicHint: "유산(단원명)" },
    ],
  },
  {
    id: "고-공통영어2-천재교과서-조수경",
    displayName: "천재교과서 조수경",
    course: "공통영어2",
    grade: "고1",
    lessons: [
      { title: "Lesson 1. Time to Travel", passage: "Travel Your Way!", topicHint: "여행(단원명)" },
      { title: "Lesson 2. Into the World of Art", passage: "Discovering Norman Rockwell", topicHint: "예술(단원명)" },
      { title: "Lesson 3. Go Beyond Korea", passage: "Korea’s Heritage Recognized Abroad", topicHint: "한국 유산(본문제목)" },
      { title: "Lesson 4. Technology and Our Lives", passage: "Space Technology for Everyday Use", topicHint: "우주 기술(본문제목)" },
      { title: "Special Lesson. A Picture Is Worth a Thousand Words", passage: "A Picture Is Worth a Thousand Words", topicHint: "이미지·소통(단원명)" },
    ],
  },
  {
    id: "고-영어1-ne능률-오선영",
    displayName: "NE능률 오선영",
    course: "영어Ⅰ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Journey to the Future", passage: "Who Is Your Role Model?", topicHint: "롤모델(본문제목)" },
      { title: "Lesson 2. The Power of Good Habits", passage: "Wake Up Your Lazy Brain!", topicHint: "습관(단원명)" },
      { title: "Lesson 3. Let's Live in Harmony", passage: "Under a Shared Roof", topicHint: "공존(단원명)" },
      { title: "Lesson 4. Spark Your Creativity", passage: "Seeing the Extraordinary in the Ordinary", topicHint: "창의(단원명)" },
      { title: "Lesson 5. Rise Above Challenges", passage: "A Journey From War to the Olympics", topicHint: "도전(단원명)" },
      { title: "Special Lesson. The Open Window", passage: "The Open Window", topicHint: "문학" },
    ],
  },
  {
    id: "고-영어1-ybm-박준언",
    displayName: "YBM 박준언",
    course: "영어Ⅰ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. A Better Life for Everybody", passage: "Universal Design for Everyone / extra: Inclusive Language for Equality and Diversity", topicHint: "유니버설 디자인(본문제목)" },
      { title: "Lesson 2. Smart Economic Decisions for All", passage: "The ABCs of Stocks and Stock Markets / extra: Bull Market vs. Bear Market", topicHint: "주식·경제(본문제목)" },
      { title: "Lesson 3. A Game Changer: Using Data in Sports", passage: "The Power of Data in Sports / extra: Hidden Numbers in Baseball", topicHint: "스포츠 데이터(단원명)" },
      { title: "Lesson 4. Cultural Treasures", passage: "King Jeongjo’s Grand Procession / extra: Suwon Hwaseong: A Fusion of Defenses and Daily Life", topicHint: "한국 문화유산(본문제목)" },
      { title: "Lesson 5. Into the Universe", passage: "Astronaut Yujin’s Space Log / extra: The International Space Station", topicHint: "우주(단원명)" },
    ],
  },
  {
    id: "고-영어1-동아출판-박용예",
    displayName: "동아출판 박용예",
    course: "영어Ⅰ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Best Version of Me", passage: "Becoming the Best Possible Me", topicHint: "자기계발(단원명)" },
      { title: "Lesson 2. Money Smart", passage: "Sweet Success: Lemonade Stand Economics", topicHint: "경제(단원명)" },
      { title: "Lesson 3. Act for Our Planet", passage: "Whales, the Earth’s Guardians", topicHint: "환경(단원명)" },
      { title: "Lesson 4. Digital Well-Being", passage: "Tips and Tricks for a Healthier Digital Life", topicHint: "디지털 웰빙(단원명)" },
      { title: "Lesson 5. Beyond Boundaries", passage: "Faster, Higher, Stronger: What Innovations Bring", topicHint: "스포츠 혁신(본문제목)" },
      { title: "Lesson 6. Better Together", passage: "Citizen Science: Be Part of the Solution", topicHint: "시민과학(본문제목)" },
    ],
  },
  {
    id: "고-영어1-미래엔-김성연",
    displayName: "미래엔 김성연",
    course: "영어Ⅰ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Leadership Beyond Hardship", passage: "Endurance on the Endurance", topicHint: "리더십(단원명)" },
      { title: "Lesson 2. Bridging the Gap", passage: "Seeing Through the Generation Gap", topicHint: "세대 차이(본문제목)" },
      { title: "Lesson 3. Going Digital for a Digital World", passage: "Can AI Think, Communicate, and See the World Like Us?", topicHint: "AI(본문제목)" },
      { title: "Lesson 4. The Road to an Open World", passage: "Enchanting Trips down the Romantic Road", topicHint: "여행(본문제목)" },
      { title: "Lesson 5. Discovering the Universe", passage: "Navigating the World of Artificial Satellites", topicHint: "인공위성(본문제목)" },
    ],
  },
  {
    id: "고-영어1-비상교육-홍민표",
    displayName: "비상교육 홍민표",
    course: "영어Ⅰ",
    grade: "고2",
    lessons: [
      { title: "Unit 1. Leap", passage: "Be Proud of Who You Are / “Giving Up” Has No Place in My Dictionary! / extra: A Journey to Self-Love", topicHint: "자아(단원명)" },
      { title: "Unit 2. Appreciate", passage: "Peiced Together (영어과외TV 표기 그대로. Pieced Together 오타 가능) / extra: A Journey to Samoa", topicHint: "감상(단원명)" },
      { title: "Special Unit 1. 미확인", passage: "London Transport Workers Study", topicHint: "건강(단원명)" },
      { title: "Unit 3. Embrace", passage: "Unexpected Neighbors / extra: Dolphins and Humans Work Together", topicHint: "공존(단원명)" },
      { title: "Unit 4. Innovate", passage: "Intelligent Aquaculture / extra: From Gazing to Engaging / The Future of Personalized Museum Visits", topicHint: "혁신(단원명)" },
      { title: "Special Unit 2. 미확인", topicHint: "디지털 마케팅(단원명)" },
    ],
  },
  {
    id: "고-영어1-지학사-신상근",
    displayName: "지학사 신상근",
    course: "영어Ⅰ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Smart Consumers", passage: "The Psychology Behind Shopping / extra: Online Shopping Trends", grammar: "Language Forms 예시문 — Whatever the product is, … / The more people do something, the more likely we are … (문법 항목명 공식 표기 없음)", functions: "만족 표현하기 (I’m satisfied with it.) / 충고하거나 요청하기 (I think you should think twice before you buy.)", topicHint: "현명한 소비 (교과서 Contents)" },
      { title: "Lesson 2. Why Sports Technology is the Game Changer", passage: "Technology Kicks in Soccer / extra: Best Soccer Leagues in the World", grammar: "Language Forms 예시문 — recommends that … shouldn’t … / so that players can … (문법 항목명 공식 표기 없음)", functions: "금지하기 (You’re not supposed to hold the ball for more than 3 seconds.) / 놀람 표현하기 (That’s fascinating.)", topicHint: "스포츠와 기술 (교과서 Contents)" },
      { title: "Lesson 3. Building for Change", passage: "Kéré, Architect of Dreams / extra: Zaha Hadid, the First Woman Architect to Win the Pritzker Prize", grammar: "Language Forms 예시문 — Although Kéré could have given up … / While still a young student, he was awarded … (문법 항목명 공식 표기 없음)", functions: "장소 묘사하기 (It is famous for its unique design.) / 의견 묻기 (What do you think of that new eco-friendly building?)", topicHint: "건축 (교과서 Contents)" },
      { title: "Lesson 4. The Joy of Giving", passage: "Sister Kang Carla: The Angel with Blue Eyes / extra: Various Volunteer Activities You Might Want to Participate in", grammar: "Language Forms 예시문 — Born in Bernezzo …, Sister Carla became … / The saddest thing … was not the fact that … (문법 항목명 공식 표기 없음)", functions: "유감 표현하기 (I’m sorry to hear that.) / 동의하기 (I couldn’t agree more.)", topicHint: "봉사 (교과서 Contents)" },
      { title: "Lesson 5. Unlock Your Original Thinking", passage: "Out of the Box with Original Thinking / extra: The Dark Side of Being a Child Prodigy", grammar: "Language Forms 예시문 — finding out if a better option exists / You are either born with it or you aren’t (문법 항목명 공식 표기 없음)", functions: "궁금증 표현하기 (I wonder who came up with the idea.) / 모르고 있음 표현하기 (I haven’t got a clue.)", topicHint: "창의 (교과서 Contents)" },
    ],
  },
  {
    id: "고-영어1-천재교과서-강상구",
    displayName: "천재교과서 강상구",
    course: "영어Ⅰ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Digital Well-being", passage: "Joy of Missing Out", topicHint: "디지털 웰빙(단원명)" },
      { title: "Lesson 2. Spark Your Creativity", passage: "Art That Makes Us Smile", topicHint: "창의·예술(단원명)" },
      { title: "Lesson 3. Healthy Plate, Healthy Planet", passage: "The Future of Food", topicHint: "식량 미래(본문제목)" },
      { title: "Lesson 4. Amazing Animals Around Us", passage: "A World on the Wing", topicHint: "동물(단원명)" },
      { title: "Lesson 5. Ancient Worlds of Imagination", passage: "Baucis and Philemon", topicHint: "신화(본문제목)" },
      { title: "Special Lesson. Music and Everything Else", passage: "If the Mathematical Constant Pi Was a Song, What Would It Sound Like", topicHint: "음악(단원명)" },
    ],
  },
  {
    id: "고-영어1-천재교과서-조수경",
    displayName: "천재교과서 조수경",
    course: "영어Ⅰ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. For a Satisfying Life", passage: "Life Is a Journey to Be Experienced", topicHint: "삶(단원명)" },
      { title: "Lesson 2. Creativity Is Key", passage: "The Potential of Unconventional Thinking", topicHint: "창의(단원명)" },
      { title: "Lesson 3. In Harmony with Nature", passage: "Wetlands Around the World", topicHint: "습지·자연(본문제목)" },
      { title: "Lesson 4. The Spirit of Sports", passage: "From a Kid to a Champion", topicHint: "스포츠(단원명)" },
      { title: "Lesson 5. Explore the Amazing World", passage: "A Law as a Window to Culture", topicHint: "법·문화(본문제목)" },
      { title: "Lesson 6. Art in Our Lives", passage: "The Art of Dots", topicHint: "예술(단원명)" },
    ],
  },
  {
    id: "고-영어2-ne능률-오선영",
    displayName: "NE능률 오선영",
    course: "영어Ⅱ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Build a Better World", passage: "Two Heroes Who Fought a Deadly Disease", topicHint: "공중보건·영웅(본문제목)" },
      { title: "Lesson 2. The World of Scientific Discovery", passage: "Science Is for Everyone", topicHint: "과학(단원명)" },
      { title: "Lesson 3. Life Is a Sum of Choices", passage: "There’s More than One Way to Vote", topicHint: "투표·선택(본문제목)" },
      { title: "Lesson 4. Create a Greener Tomorrow", passage: "Breaking the Cycle: Solutions to E-waste", topicHint: "전자폐기물(본문제목)" },
      { title: "Lesson 5. Open Your Mind, Defeat Your Biases", passage: "The Colorful Truth About Ancient Sculptures", topicHint: "편견(단원명)" },
      { title: "Special Lesson. The Model Millionaire", passage: "The Model Millionaire", topicHint: "문학" },
    ],
  },
  {
    id: "고-영어2-ybm-박준언",
    displayName: "YBM 박준언",
    course: "영어Ⅱ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Connecting Through Pop Culture", passage: "The Story of Hip-hop Music / extra: Rhyme in Rap", topicHint: "힙합(본문제목)" },
      { title: "Lesson 2. From Casual Buyers to Lasting Fans", passage: "The Subscription Economy: From Ownership to Access / extra: Happiness Comes From Experiences", topicHint: "구독 경제(본문제목)" },
      { title: "Lesson 3. Living With Viruses", passage: "The Varied World of Viruses / extra: The Strange Mask of the Plague Doctor", topicHint: "바이러스(단원명)" },
      { title: "Lesson 4. Act Now for Our Oceans!", passage: "The Guardian of the Blue Heart of the Planet / extra: The Ocean: A Key to Solve Climate Change", topicHint: "해양(단원명)" },
      { title: "Lesson 5. Shaping a Brighter Future", passage: "The Perfect Match / extra: AI and Consciousness", topicHint: "AI(본문제목)" },
    ],
  },
  {
    id: "고-영어2-동아출판-박용예",
    displayName: "동아출판 박용예",
    course: "영어Ⅱ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Lead Your Life", passage: "The Power of Atomic Habits", topicHint: "습관(본문제목)" },
      { title: "Lesson 2. Traveling Green", passage: "Exploring Nature in Australia", topicHint: "생태 여행(본문제목)" },
      { title: "Lesson 3. Art in Life", passage: "Art that Inspires", topicHint: "예술(단원명)" },
      { title: "Lesson 4. Voice Your Thoughts", passage: "Education Debate: Online VS. Traditional by Emily Mitchell, Editor", topicHint: "토론(단원명)" },
      { title: "Lesson 5. Beauty of Literature", passage: "Through the Tunnel by Doris Lessing", topicHint: "문학" },
      { title: "Lesson 6. Voyage Across The Universe", passage: "Technologies for a Space Odyssey", topicHint: "우주 기술(본문제목)" },
    ],
  },
  {
    id: "고-영어2-미래엔-김성연",
    displayName: "미래엔 김성연",
    course: "영어Ⅱ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Being a Fan: Passion and Pride", passage: "Theories and Practices of Sports Fandom", topicHint: "팬덤(단원명)" },
      { title: "Lesson 2. Going Green for a Blue Planet", passage: "Getbol: A Treasure House with Great Potential", topicHint: "갯벌(본문제목)" },
      { title: "Lesson 3. From Words to Worlds", passage: "The Model Millionaire", topicHint: "문학" },
      { title: "Lesson 4. Fostering Curiosity and Creativity", passage: "What-If Science", topicHint: "과학적 상상(본문제목)" },
      { title: "Lesson 5. Map Your Way to the Future", passage: "Inspiring Words for Moving Forward", topicHint: "진로(단원명)" },
    ],
  },
  {
    id: "고-영어2-비상교육-홍민표",
    displayName: "비상교육 홍민표",
    course: "영어Ⅱ",
    grade: "고2",
    lessons: [
      { title: "Unit 1. Cultivate", passage: "My Hobbies Define Me", topicHint: "취미(본문제목)" },
      { title: "Unit 2. Protect", passage: "The World of Sports Taking Responsibility", topicHint: "스포츠·책임(본문제목)" },
      { title: "Unit 3. Harmonize", passage: "You’re Just Hangry!", topicHint: "감정·식욕(본문제목)" },
      { title: "Unit 4. Criticize", passage: "Sharpening Your Media Literacy Senses", topicHint: "미디어 리터러시(본문제목)" },
      { title: "Special Unit 1. 미확인", passage: "A Dollar on the Conscience" },
      { title: "Special Unit 2. 미확인", passage: "Sing Together, Build Bonds", topicHint: "음악·유대(단원명)" },
    ],
  },
  {
    id: "고-영어2-지학사-신상근",
    displayName: "지학사 신상근",
    course: "영어Ⅱ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Design that Benefits All", passage: "Universal Design / extra: Universal Design Playground", grammar: "Language Forms 예시문 — make it possible for people to … / Without curb cuts, people … would have … (문법 항목명 공식 표기 없음)", functions: "바람 표현하기 (I wish there were bike ramps …) / 설명 요청하기 (Can you show me how?)", topicHint: "공동체 (교과서 Contents)" },
      { title: "Lesson 2. The Future on Our Plates", passage: "Lab-Grown Meat / extra: Sustainable Foods of the World", grammar: "Language Forms 예시문 — emits significantly more … than … does / might seem odd to many people (문법 항목명 공식 표기 없음)", functions: "제안·권유하기 (I suggest we eat more berries.) / 의견 표현하기 (It seems that we will need to change our food sources.)", topicHint: "음식과 미래 (교과서 Contents)" },
      { title: "Lesson 3. Mathematics Is More Than Just Numbers", passage: "Mathematics Is Everywhere / extra: How Fast Should Santa Travel?", grammar: "Language Forms 예시문 — Filling window seats first gets rid of … / has been considered the most important criterion (문법 항목명 공식 표기 없음)", functions: "강조하기 (It is important to understand …) / 생각할 시간 요청하기 (Just a second.)", topicHint: "일상 속 수학 (교과서 Contents)" },
      { title: "Lesson 4. Colorful Stories of Colors", passage: "The Power of Colors in Movies / extra: National Flags with Three Colors", grammar: "Language Forms 예시문 — It was the strong contrast of colors that enabled … / as if he were an ordinary person (문법 항목명 공식 표기 없음)", functions: "동의하기 (That’s a great idea.) / 알고 있는지 묻기 (Did you know that …?)", topicHint: "색과 영화 (교과서 Contents)" },
      { title: "Lesson 5. Winning with AI", passage: "Future-Proof Your Career / extra: Weak AI vs. Strong AI: Exploring Key Differences", grammar: "Language Forms 예시문 — the context in which you’re asking / nor does it have the ability to … (문법 항목명 공식 표기 없음)", functions: "가능성 정도 표현하기 (Is it possible for AI to …?) / 예시 들기 (A good example is the position of AI bias analyst.)", topicHint: "기술과 미래 역량 (교과서 Contents)" },
      { title: "Lesson 6. Adventures in Literature", passage: "The Old Man and the Sea / extra: Literary Festivals Around the World", grammar: "Language Forms 예시문 — from where it had been bitten / Neither fear nor the loss of his spear could … (문법 항목명 공식 표기 없음)", functions: "관심이나 무관심 표현하기 (Did you find the movie interesting?) / 공감 표현하기 (I feel the same way.)", topicHint: "문학 (교과서 Contents)" },
    ],
  },
  {
    id: "고-영어2-천재교과서-강상구",
    displayName: "천재교과서 강상구",
    course: "영어Ⅱ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. The Road to Happiness", passage: "Constantly in Motion / extra: Fall Forward", topicHint: "행복(단원명)" },
      { title: "Lesson 2. Ideas for the Common Good", passage: "Nudging Toward a Better Society / extra: Dark Patterns", topicHint: "넛지·사회(본문제목)" },
      { title: "Lesson 3. The Power of Textiles", passage: "How Textiles Weave the World / extra: Unique Attempts in Textile Art", topicHint: "직물(단원명)" },
      { title: "Lesson 4. Shaping Our Future with AI", passage: "The Future Is Now / The Rise of AI and Its Shaping of Tomorrow / extra: What Would Life Be like After the Technological Singularity?", topicHint: "AI(단원명)" },
      { title: "Lesson 5. Climate and Our Lives", passage: "Weather’s Hand in History / extra: Climate by Design", topicHint: "기후(단원명)" },
      { title: "Special Lesson. Short Stories, Long Impacts", passage: "The Elephant Keeper", topicHint: "단편(단원명)" },
    ],
  },
  {
    id: "고-영어2-천재교과서-조수경",
    displayName: "천재교과서 조수경",
    course: "영어Ⅱ",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. The Gift of Friendship", passage: "Picasso and His Barber / extra: Dog Tails, Dolphin Waves", topicHint: "우정(단원명)" },
      { title: "Lesson 2. Building a Healthy Life", passage: "The Joy of Walking / extra: Space Out!", topicHint: "건강(단원명)" },
      { title: "Lesson 3. Nature Is Full of Wonders!", passage: "Seeds as the Best Survival Strategy / extra: The Tallest Tree on Earth", topicHint: "자연(단원명)" },
      { title: "Lesson 4. Flavors Without Borders", passage: "An Underwater Delicacy / extra: From “Black Gold” to Everyday Seasoning", topicHint: "음식(단원명)" },
      { title: "Lesson 5. Together, We Thrive", passage: "7000 Oaks Make a Forest / extra: The Work of a Miracle", topicHint: "공동체 예술(본문제목)" },
      { title: "Lesson 6. Living with AI", passage: "See the Future in Movies / extra: AI in Cinema Industry", topicHint: "AI·영화(본문제목)" },
    ],
  },
  {
    id: "고-영어-독해와-작문-ne능률-민병천",
    displayName: "NE능률 민병천",
    course: "영어 독해와 작문",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. A Step to Spark Change", topicHint: "변화(단원명)" },
      { title: "Lesson 2. Listening to the Voice of Art", topicHint: "예술(단원명)" },
      { title: "Lesson 3. Mathematics around Us", topicHint: "수학(단원명)" },
      { title: "Lesson 4. Preserving the Past, Protecting the Future", topicHint: "유산 보존(단원명)" },
      { title: "Lesson 5. Talk about Tech", topicHint: "기술(단원명)" },
      { title: "Lesson 6. The World in Our Mind", topicHint: "마음·심리(단원명)" },
    ],
  },
  {
    id: "고-영어-독해와-작문-천재교과서-윤성호",
    displayName: "천재교과서 윤성호",
    course: "영어 독해와 작문",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. Happiness Just beside You", topicHint: "행복(단원명)" },
    ],
  },
  {
    id: "고-기본영어1-ne능률-안병규",
    displayName: "NE능률 안병규",
    course: "기본영어1",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. My Friends and Me" },
      { title: "Lesson 2. Into the K-Culture" },
      { title: "Lesson 3. Hit the Road!" },
      { title: "Lesson 4. One Earth, One Chance" },
    ],
  },
  {
    id: "고-기본영어2-ne능률-안병규",
    displayName: "NE능률 안병규",
    course: "기본영어2",
    grade: "고2",
    lessons: [
      { title: "Lesson 1. A Bright Future Ahead" },
      { title: "Lesson 2. Eat Well, Feel Good" },
      { title: "Lesson 3. Everyone's Creative" },
      { title: "Lesson 4. Shaping the Future with Technology" },
    ],
  },
  {
    id: "고-심화-영어-ne능률-안병규",
    displayName: "NE능률 안병규",
    course: "심화 영어",
    grade: "고3",
    lessons: [
      { title: "Unit 1. Symbols & Associations" },
      { title: "Unit 2. Environment & Ecosystem" },
      { title: "Unit 3. Creativity & Innovation" },
      { title: "Unit 4. Insights & Perspectives" },
    ],
  },
  {
    id: "고-영미-문학-읽기-ne능률-안병규",
    displayName: "NE능률 안병규",
    course: "영미 문학 읽기",
    grade: "고3",
    lessons: [
      { title: "Unit 1. Exploring Poetry" },
      { title: "Unit 2. Uncovering Fiction" },
      { title: "Unit 3. Bringing Drama to Life" },
      { title: "Unit 4. Dreaming Beyond Reality" },
    ],
  },
  {
    id: "고-실생활-영어-회화-ne능률-민병천",
    displayName: "NE능률 민병천",
    course: "실생활 영어 회화",
    grade: "고3",
    lessons: [
      { title: "Lesson 1. Discover Yourself" },
      { title: "Lesson 2. Coloring Your Life" },
      { title: "Lesson 3. Be a Wise Consumer" },
      { title: "Lesson 4. Time to Pack Your Bags" },
      { title: "Lesson 5. Living in Harmony" },
      { title: "Lesson 6. Life as a Digital Native" },
    ],
  },
  {
    id: "고-세계-문화와-영어-ne능률-안병규",
    displayName: "NE능률 안병규",
    course: "세계 문화와 영어",
    grade: "고3",
    lessons: [
      { title: "Unit 1. Cross-Cultural Encounters" },
      { title: "Unit 2. Flavors of the World" },
      { title: "Unit 3. Language Insights into Diversity" },
      { title: "Unit 4. Travel In Search of the Unseen" },
    ],
  },
];

const COURSE_ORDER: Record<string, string[]> = {
  "중1": [
    "중1"
  ],
  "중2": [
    "중2"
  ],
  "고1": [
    "공통영어1",
    "공통영어2"
  ],
  "고2": [
    "영어Ⅰ",
    "영어Ⅱ",
    "영어 독해와 작문",
    "기본영어1",
    "기본영어2"
  ],
  "고3": [
    "심화 영어",
    "영미 문학 읽기",
    "실생활 영어 회화",
    "세계 문화와 영어"
  ]
};

export function getEnglishCoursesForGrade(grade: string | null | undefined): string[] {
  if (!grade) return [];
  return COURSE_ORDER[grade.trim()] ?? [];
}

export function getEnglishTextbooks(
  grade: string | null | undefined,
  course?: string | null,
): EnglishTextbook[] {
  if (!grade) return [];
  const g = grade.trim();
  return ENGLISH_TEXTBOOKS.filter((b) => {
    if (b.grade !== g) return false;
    if (course && course.trim()) return b.course === course.trim();
    return true;
  });
}

export function getEnglishTextbookById(id: string | null | undefined): EnglishTextbook | undefined {
  if (!id) return undefined;
  return ENGLISH_TEXTBOOKS.find((b) => b.id === id);
}

/** 출제범위 value — AI 프롬프트·저장용 표시 문자열 */
export function formatEnglishLessonScopeValue(book: EnglishTextbook, lessonTitle: string): string {
  return `${book.course} > ${book.displayName} > ${lessonTitle}`;
}

function lessonHint(lesson: EnglishTextbookLesson): string | undefined {
  const bits = [lesson.grammar, lesson.passage].filter(Boolean);
  return bits.length ? bits.join(' · ') : undefined;
}

export function getEnglishLessonScopeOptions(textbookId: string | null | undefined): Array<{
  value: string;
  label: string;
  hint?: string;
}> {
  const book = getEnglishTextbookById(textbookId);
  if (!book) return [];
  return book.lessons.map((l) => ({
    value: formatEnglishLessonScopeValue(book, l.title),
    hint: lessonHint(l),
    label: l.title,
  }));
}

export function findEnglishLessonByScopeValue(value: string): EnglishTextbookLesson | undefined {
  const parts = value.split(' > ').map((p) => p.trim());
  if (parts.length < 3) return undefined;
  const [course, displayName, ...rest] = parts;
  const title = rest.join(' > ');
  const book = ENGLISH_TEXTBOOKS.find((b) => b.course === course && b.displayName === displayName);
  return book?.lessons.find((l) => l.title === title);
}

/** 분석 프롬프트용 — 선택한 레슨의 본문·문법을 같이 적는다 */
export function describeEnglishExamScope(scope: string[]): string {
  return scope.map((value) => {
    const lesson = findEnglishLessonByScopeValue(value);
    if (!lesson) return `- ${value}`;
    const lines = [`- ${value}`];
    if (lesson.passage) lines.push(`  본문: ${lesson.passage}`);
    if (lesson.grammar) lines.push(`  문법: ${lesson.grammar}`);
    if (lesson.functions) lines.push(`  의사소통: ${lesson.functions}`);
    return lines.join('\n');
  }).join('\n');
}
