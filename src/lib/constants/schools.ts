/**
 * School region mapping data for Daegu and Gyeongbuk area.
 * Converted from Python source: backend/app/data/school_regions.py
 */

export interface SchoolData {
  name: string;
  city: string;
  district: string;
  schoolType: string; // "중학교", "일반고", "특목고", "특성화고", "자사고"
}

export const SCHOOL_DATA: SchoolData[] = [
  // ============================================
  // 대구광역시 - 수성구
  // ============================================
  { name: "경신중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "동도중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "정화중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "대구동중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "대구동부중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "대륜중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "오성중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "소선여자중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "신명여자중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "황금중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "능인중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "지산중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "범물중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "범일중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "고산중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "노변중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "덕원중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "매호중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "시지중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "대구중앙중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "덕화중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "수성중학교", city: "대구광역시", district: "수성구", schoolType: "중학교" },
  { name: "경신고등학교", city: "대구광역시", district: "수성구", schoolType: "일반고" },
  { name: "대륜고등학교", city: "대구광역시", district: "수성구", schoolType: "일반고" },
  { name: "오성고등학교", city: "대구광역시", district: "수성구", schoolType: "일반고" },
  { name: "정화여자고등학교", city: "대구광역시", district: "수성구", schoolType: "일반고" },
  { name: "대구혜화여자고등학교", city: "대구광역시", district: "수성구", schoolType: "일반고" },
  { name: "경북고등학교", city: "대구광역시", district: "수성구", schoolType: "일반고" },
  { name: "대구과학고등학교", city: "대구광역시", district: "수성구", schoolType: "특목고" },
  { name: "덕원고등학교", city: "대구광역시", district: "수성구", schoolType: "일반고" },
  { name: "시지고등학교", city: "대구광역시", district: "수성구", schoolType: "일반고" },
  { name: "대구자연과학고등학교", city: "대구광역시", district: "수성구", schoolType: "특성화고" },
  { name: "대구관광고등학교", city: "대구광역시", district: "수성구", schoolType: "특성화고" },
  { name: "남산고등학교", city: "대구광역시", district: "수성구", schoolType: "일반고" },

  // ============================================
  // 대구광역시 - 달서구
  // ============================================
  { name: "월배중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "영남중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "상인중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "상원중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "도원중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "대곡중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "대서중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "송현여자중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "효성중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "대건중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "조암중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "월서중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "월암중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "학산중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "성서중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "이곡중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "성지중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "와룡중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "성산중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "용산중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "경암중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "새본리중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "성당중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "원화중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "구남중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "성곡중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "대진중학교", city: "대구광역시", district: "달서구", schoolType: "중학교" },
  { name: "영남고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "상원고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "도원고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "대곡고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "대진고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "효성여자고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "대건고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "경화여자고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "원화여자고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "송현여자고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "성서고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "와룡고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "경원고등학교", city: "대구광역시", district: "달서구", schoolType: "일반고" },
  { name: "대구외국어고등학교", city: "대구광역시", district: "달서구", schoolType: "특목고" },
  { name: "경북기계공업고등학교", city: "대구광역시", district: "달서구", schoolType: "특성화고" },
  { name: "대구제일여자상업고등학교", city: "대구광역시", district: "달서구", schoolType: "특성화고" },
  { name: "대구보건고등학교", city: "대구광역시", district: "달서구", schoolType: "특성화고" },
  { name: "달서공업고등학교", city: "대구광역시", district: "달서구", schoolType: "특성화고" },

  // ============================================
  // 대구광역시 - 북구
  // ============================================
  { name: "강북중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "관음중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "관천중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "구암중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "교동중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "동평중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "매천중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "운암중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "칠곡중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "학남중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "침산중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "대구일중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "경명여자중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "대구북중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "복현중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "산격중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "성광중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "성화중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "연경중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "무태동변중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "무태서변중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "사수중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "대구체육중학교", city: "대구광역시", district: "북구", schoolType: "중학교" },
  { name: "경상고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "성광고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "경명여자고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "영진고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "경상여자고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "칠곡고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "운암고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "강북고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "영송여자고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "매천고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "구암고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "함지고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "학남고등학교", city: "대구광역시", district: "북구", schoolType: "일반고" },
  { name: "대구국제고등학교", city: "대구광역시", district: "북구", schoolType: "특목고" },
  { name: "대구체육고등학교", city: "대구광역시", district: "북구", schoolType: "특목고" },

  // ============================================
  // 대구광역시 - 동구
  // ============================================
  { name: "새론중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "강동중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "율원중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "안심중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "신아중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "청구중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "동촌중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "입석중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "불로중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "공산중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "대구팔공중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "신기중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "영신중학교", city: "대구광역시", district: "동구", schoolType: "중학교" },
  { name: "청구고등학교", city: "대구광역시", district: "동구", schoolType: "일반고" },
  { name: "정동고등학교", city: "대구광역시", district: "동구", schoolType: "일반고" },
  { name: "영신고등학교", city: "대구광역시", district: "동구", schoolType: "일반고" },
  { name: "동부고등학교", city: "대구광역시", district: "동구", schoolType: "일반고" },
  { name: "강동고등학교", city: "대구광역시", district: "동구", schoolType: "일반고" },
  { name: "조일고등학교", city: "대구광역시", district: "동구", schoolType: "일반고" },
  { name: "대구공업고등학교", city: "대구광역시", district: "동구", schoolType: "특성화고" },

  // ============================================
  // 대구광역시 - 서구
  // ============================================
  { name: "경운중학교", city: "대구광역시", district: "서구", schoolType: "중학교" },
  { name: "경일중학교", city: "대구광역시", district: "서구", schoolType: "중학교" },
  { name: "중리중학교", city: "대구광역시", district: "서구", schoolType: "중학교" },
  { name: "평리중학교", city: "대구광역시", district: "서구", schoolType: "중학교" },
  { name: "서대구중학교", city: "대구광역시", district: "서구", schoolType: "중학교" },
  { name: "대구청라중학교", city: "대구광역시", district: "서구", schoolType: "중학교" },
  { name: "달성고등학교", city: "대구광역시", district: "서구", schoolType: "일반고" },
  { name: "경덕여자고등학교", city: "대구광역시", district: "서구", schoolType: "일반고" },
  { name: "대구서부고등학교", city: "대구광역시", district: "서구", schoolType: "일반고" },
  { name: "대구제일고등학교", city: "대구광역시", district: "서구", schoolType: "일반고" },

  // ============================================
  // 대구광역시 - 남구
  // ============================================
  { name: "경상중학교", city: "대구광역시", district: "남구", schoolType: "중학교" },
  { name: "대구중학교", city: "대구광역시", district: "남구", schoolType: "중학교" },
  { name: "대명중학교", city: "대구광역시", district: "남구", schoolType: "중학교" },
  { name: "협성경복중학교", city: "대구광역시", district: "남구", schoolType: "중학교" },
  { name: "경일여자중학교", city: "대구광역시", district: "남구", schoolType: "중학교" },
  { name: "경혜여자중학교", city: "대구광역시", district: "남구", schoolType: "중학교" },
  { name: "성명여자중학교", city: "대구광역시", district: "남구", schoolType: "중학교" },
  { name: "경일여자고등학교", city: "대구광역시", district: "남구", schoolType: "일반고" },
  { name: "협성고등학교", city: "대구광역시", district: "남구", schoolType: "일반고" },
  { name: "대구고등학교", city: "대구광역시", district: "남구", schoolType: "일반고" },
  { name: "경상공업고등학교", city: "대구광역시", district: "남구", schoolType: "특성화고" },

  // ============================================
  // 대구광역시 - 중구
  // ============================================
  { name: "경북대사범대학부설중학교", city: "대구광역시", district: "중구", schoolType: "중학교" },
  { name: "계성중학교", city: "대구광역시", district: "중구", schoolType: "중학교" },
  { name: "대구제일중학교", city: "대구광역시", district: "중구", schoolType: "중학교" },
  { name: "경북대사범대학부설고등학교", city: "대구광역시", district: "중구", schoolType: "일반고" },
  { name: "경북여자고등학교", city: "대구광역시", district: "중구", schoolType: "일반고" },
  { name: "신명고등학교", city: "대구광역시", district: "중구", schoolType: "일반고" },

  // ============================================
  // 대구광역시 - 달성군
  // ============================================
  { name: "다사중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "왕선중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "서동중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "심인중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "화원중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "천내중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "달성중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "북동중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "경서중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "현풍중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "유가중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "포산중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "비슬중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "가창중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "달서중학교", city: "대구광역시", district: "달성군", schoolType: "중학교" },
  { name: "포산고등학교", city: "대구광역시", district: "달성군", schoolType: "일반고" },
  { name: "현풍고등학교", city: "대구광역시", district: "달성군", schoolType: "일반고" },
  { name: "비슬고등학교", city: "대구광역시", district: "달성군", schoolType: "일반고" },
  { name: "다사고등학교", city: "대구광역시", district: "달성군", schoolType: "일반고" },
  { name: "심인고등학교", city: "대구광역시", district: "달성군", schoolType: "일반고" },
  { name: "대구소프트웨어마이스터고등학교", city: "대구광역시", district: "달성군", schoolType: "특성화고" },

  // ============================================
  // 대구광역시 - 군위군
  // ============================================
  { name: "군위중학교", city: "대구광역시", district: "군위군", schoolType: "중학교" },
  { name: "부계중학교", city: "대구광역시", district: "군위군", schoolType: "중학교" },
  { name: "의흥중학교", city: "대구광역시", district: "군위군", schoolType: "중학교" },
  { name: "군위고등학교", city: "대구광역시", district: "군위군", schoolType: "일반고" },

  // ============================================
  // 경상북도 - 포항시
  // ============================================
  { name: "포항제철고등학교", city: "경상북도", district: "포항시", schoolType: "일반고" },
  { name: "포항고등학교", city: "경상북도", district: "포항시", schoolType: "일반고" },
  { name: "포항여자고등학교", city: "경상북도", district: "포항시", schoolType: "일반고" },
  { name: "경북과학고등학교", city: "경상북도", district: "포항시", schoolType: "특목고" },
  { name: "포항동성고등학교", city: "경상북도", district: "포항시", schoolType: "일반고" },
  { name: "포항과학기술고등학교", city: "경상북도", district: "포항시", schoolType: "특성화고" },
  { name: "포항해양과학고등학교", city: "경상북도", district: "포항시", schoolType: "특성화고" },
  { name: "포항포은중학교", city: "경상북도", district: "포항시", schoolType: "중학교" },
  { name: "포항항도중학교", city: "경상북도", district: "포항시", schoolType: "중학교" },
  { name: "포항제철중학교", city: "경상북도", district: "포항시", schoolType: "중학교" },

  // ============================================
  // 경상북도 - 구미시
  // ============================================
  { name: "구미고등학교", city: "경상북도", district: "구미시", schoolType: "일반고" },
  { name: "구미여자고등학교", city: "경상북도", district: "구미시", schoolType: "일반고" },
  { name: "구미전자공업고등학교", city: "경상북도", district: "구미시", schoolType: "특성화고" },
  { name: "금오공업고등학교", city: "경상북도", district: "구미시", schoolType: "특성화고" },
  { name: "구미산동고등학교", city: "경상북도", district: "구미시", schoolType: "일반고" },
  { name: "경북외국어고등학교", city: "경상북도", district: "구미시", schoolType: "특목고" },
  { name: "구미사곡고등학교", city: "경상북도", district: "구미시", schoolType: "일반고" },
  { name: "구미여자상업고등학교", city: "경상북도", district: "구미시", schoolType: "특성화고" },
  { name: "구미중학교", city: "경상북도", district: "구미시", schoolType: "중학교" },
  { name: "구미여자중학교", city: "경상북도", district: "구미시", schoolType: "중학교" },
  { name: "형곡중학교", city: "경상북도", district: "구미시", schoolType: "중학교" },
  { name: "옥계중학교", city: "경상북도", district: "구미시", schoolType: "중학교" },
  { name: "옥계동부중학교", city: "경상북도", district: "구미시", schoolType: "중학교" },
  { name: "구미인덕중학교", city: "경상북도", district: "구미시", schoolType: "중학교" },
  { name: "구미신평중학교", city: "경상북도", district: "구미시", schoolType: "중학교" },

  // ============================================
  // 경상북도 - 경주시
  // ============================================
  { name: "경주고등학교", city: "경상북도", district: "경주시", schoolType: "일반고" },
  { name: "경주여자고등학교", city: "경상북도", district: "경주시", schoolType: "일반고" },
  { name: "경주화랑고등학교", city: "경상북도", district: "경주시", schoolType: "일반고" },
  { name: "경주예일고등학교", city: "경상북도", district: "경주시", schoolType: "일반고" },
  { name: "경주정보고등학교", city: "경상북도", district: "경주시", schoolType: "특성화고" },
  { name: "경주여자정보고등학교", city: "경상북도", district: "경주시", schoolType: "특성화고" },
  { name: "경주중학교", city: "경상북도", district: "경주시", schoolType: "중학교" },
  { name: "경주여자중학교", city: "경상북도", district: "경주시", schoolType: "중학교" },

  // ============================================
  // 경상북도 - 안동시
  // ============================================
  { name: "안동고등학교", city: "경상북도", district: "안동시", schoolType: "일반고" },
  { name: "안동여자고등학교", city: "경상북도", district: "안동시", schoolType: "일반고" },
  { name: "경북하이텍고등학교", city: "경상북도", district: "안동시", schoolType: "특성화고" },
  { name: "풍산고등학교", city: "경상북도", district: "안동시", schoolType: "일반고" },
  { name: "안동중앙고등학교", city: "경상북도", district: "안동시", schoolType: "일반고" },
  { name: "안동중학교", city: "경상북도", district: "안동시", schoolType: "중학교" },
  { name: "안동여자중학교", city: "경상북도", district: "안동시", schoolType: "중학교" },

  // ============================================
  // 경상북도 - 경산시
  // ============================================
  { name: "경산과학고등학교", city: "경상북도", district: "경산시", schoolType: "특목고" },
  { name: "경산여자고등학교", city: "경상북도", district: "경산시", schoolType: "일반고" },
  { name: "무학고등학교", city: "경상북도", district: "경산시", schoolType: "일반고" },
  { name: "경산고등학교", city: "경상북도", district: "경산시", schoolType: "일반고" },
  { name: "경산제일고등학교", city: "경상북도", district: "경산시", schoolType: "일반고" },
  { name: "경산여자상업고등학교", city: "경상북도", district: "경산시", schoolType: "특성화고" },
  { name: "경산중학교", city: "경상북도", district: "경산시", schoolType: "중학교" },
  { name: "경산여자중학교", city: "경상북도", district: "경산시", schoolType: "중학교" },
  { name: "사동중학교", city: "경상북도", district: "경산시", schoolType: "중학교" },
  { name: "장산중학교", city: "경상북도", district: "경산시", schoolType: "중학교" },

  // ============================================
  // 경상북도 - 울진군
  // ============================================
  { name: "한국원자력마이스터고등학교", city: "경상북도", district: "울진군", schoolType: "특성화고" },
  { name: "울진고등학교", city: "경상북도", district: "울진군", schoolType: "일반고" },
  { name: "죽변고등학교", city: "경상북도", district: "울진군", schoolType: "일반고" },
  { name: "후포고등학교", city: "경상북도", district: "울진군", schoolType: "일반고" },
  { name: "경북관광비즈니스고등학교", city: "경상북도", district: "울진군", schoolType: "특성화고" },

  // ============================================
  // 경상북도 - 봉화군
  // ============================================
  { name: "봉화고등학교", city: "경상북도", district: "봉화군", schoolType: "일반고" },
  { name: "한국산림과학고등학교", city: "경상북도", district: "봉화군", schoolType: "특성화고" },
  { name: "한국펫고등학교", city: "경상북도", district: "봉화군", schoolType: "특성화고" },
  { name: "봉화중학교", city: "경상북도", district: "봉화군", schoolType: "중학교" },

  // ============================================
  // 경상북도 - 영주시
  // ============================================
  { name: "영주제일고등학교", city: "경상북도", district: "영주시", schoolType: "일반고" },
  { name: "영주여자고등학교", city: "경상북도", district: "영주시", schoolType: "일반고" },
  { name: "대영고등학교", city: "경상북도", district: "영주시", schoolType: "일반고" },
  { name: "영주부석고등학교", city: "경상북도", district: "영주시", schoolType: "일반고" },
  { name: "경북항공고등학교", city: "경상북도", district: "영주시", schoolType: "특성화고" },

  // ============================================
  // 경상북도 - 문경시
  // ============================================
  { name: "문경공업고등학교", city: "경상북도", district: "문경시", schoolType: "특성화고" },
  { name: "경북조리과학고등학교", city: "경상북도", district: "문경시", schoolType: "특성화고" },
  { name: "점촌고등학교", city: "경상북도", district: "문경시", schoolType: "일반고" },

  // ============================================
  // 경상북도 - 상주시
  // ============================================
  { name: "상주공업고등학교", city: "경상북도", district: "상주시", schoolType: "특성화고" },
  { name: "상주여자고등학교", city: "경상북도", district: "상주시", schoolType: "일반고" },

  // ============================================
  // 경상북도 - 의성군
  // ============================================
  { name: "의성고등학교", city: "경상북도", district: "의성군", schoolType: "일반고" },
  { name: "의성여자고등학교", city: "경상북도", district: "의성군", schoolType: "일반고" },
  { name: "경북소프트웨어고등학교", city: "경상북도", district: "의성군", schoolType: "특성화고" },
  { name: "경북중부중학교", city: "경상북도", district: "의성군", schoolType: "중학교" },

  // ============================================
  // 경상북도 - 예천군
  // ============================================
  { name: "예천여자고등학교", city: "경상북도", district: "예천군", schoolType: "일반고" },
  { name: "대창고등학교", city: "경상북도", district: "예천군", schoolType: "일반고" },
  { name: "경북일고등학교", city: "경상북도", district: "예천군", schoolType: "일반고" },

  // ============================================
  // 경상북도 - 고령군
  // ============================================
  { name: "대가야고등학교", city: "경상북도", district: "고령군", schoolType: "일반고" },
  { name: "고령고등학교", city: "경상북도", district: "고령군", schoolType: "일반고" },
  { name: "고령중학교", city: "경상북도", district: "고령군", schoolType: "중학교" },

  // ============================================
  // 경상북도 - 청도군
  // ============================================
  { name: "청도고등학교", city: "경상북도", district: "청도군", schoolType: "일반고" },
  { name: "청도전자고등학교", city: "경상북도", district: "청도군", schoolType: "특성화고" },
  { name: "모계고등학교", city: "경상북도", district: "청도군", schoolType: "일반고" },

  // ============================================
  // 경상북도 - 영덕군
  // ============================================
  { name: "영덕고등학교", city: "경상북도", district: "영덕군", schoolType: "일반고" },
  { name: "영덕여자고등학교", city: "경상북도", district: "영덕군", schoolType: "일반고" },

  // ============================================
  // 경상북도 - 영천시
  // ============================================
  { name: "영천고등학교", city: "경상북도", district: "영천시", schoolType: "일반고" },
  { name: "영천여자고등학교", city: "경상북도", district: "영천시", schoolType: "일반고" },
  { name: "영천전자고등학교", city: "경상북도", district: "영천시", schoolType: "특성화고" },
  { name: "포은고등학교", city: "경상북도", district: "영천시", schoolType: "일반고" },

  // ============================================
  // 경상북도 - 영양군
  // ============================================
  { name: "영양고등학교", city: "경상북도", district: "영양군", schoolType: "일반고" },
  { name: "영양여자고등학교", city: "경상북도", district: "영양군", schoolType: "일반고" },
  { name: "영양중학교", city: "경상북도", district: "영양군", schoolType: "중학교" },
];
