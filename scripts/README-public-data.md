# 공공데이터 API 출처 및 사용 안내

## 1. 나이스 교육정보 개방 포털 (NEIS)

| 항목 | 내용 |
|---|---|
| **출처** | [나이스 교육정보 개방 포털](https://open.neis.go.kr/) |
| **데이터셋** | [학교기본정보](https://open.neis.go.kr/portal/data/service/selectServicePage.do?infId=OPEN17020190531110010104913&infSeq=2) |
| **공공데이터포털** | [교육부_나이스 교육정보 개방 포털_초중등_학교기본정보](https://www.data.go.kr/data/15122275/openapi.do) |
| **라이선스** | 공공누리 1유형 (출처표시) |
| **엔드포인트** | `https://open.neis.go.kr/hub/schoolInfo` |
| **인증** | `KEY` 파라미터 (API키) |
| **환경변수** | `NEIS_API_KEY` |
| **수집 스크립트** | `scripts/sync-schools.ts` |
| **수집 대상** | 전국 중학교 + 고등학교 (초등학교는 convention 프로젝트에서 관리) |
| **수집 데이터** | 학교코드, 학교명, 학교급, 주소, 시도교육청, 설립유형, 남녀공학, 고교유형, 전화번호, 홈페이지, 설립일 |
| **일일 트래픽** | 제한 없음 (합리적 사용) |
| **갱신 주기** | 수시 (학기 시작 전 집중 갱신) |

## 2. 전국학교학구도연계정보 (학구도 API)

| 항목 | 내용 |
|---|---|
| **출처** | [학구도안내서비스](https://schoolzone.emac.kr/) |
| **데이터셋** | [전국학교학구도연계정보표준데이터](https://www.data.go.kr/data/15021158/standard.do) |
| **운영기관** | 한국교육시설안전원 (schoolzone@koies.or.kr) |
| **라이선스** | 공공누리 1유형 (출처표시) |
| **엔드포인트** | `http://api.data.go.kr/openapi/tn_pubr_public_schul_atndskl_zn_drw_lnkinfo_api` |
| **인증** | `serviceKey` 파라미터 (API키) |
| **환경변수** | `DISTRICT_ZONE_API_KEY` |
| **수집 스크립트** | `scripts/sync-school-zones.ts` |
| **수집 데이터** | 학구ID, 학교ID, 학교명, 학교급, 시도교육청코드/명, 교육지원청코드/명 |
| **일일 트래픽** | 1,000건 |
| **갱신 주기** | 연 2회 (학기별) |
| **참고** | 세종시는 학구도 데이터 미제공 |

## 3. 학교알리미 (초중등 교육정보 공시서비스)

| 항목 | 내용 |
|---|---|
| **출처** | [학교알리미](https://www.schoolinfo.go.kr/) |
| **환경변수** | `SCHOOLINFO_API_KEY` |
| **현재 사용** | MathLab에서 미사용 (convention 프로젝트에서 교원현황/방과후 데이터 수집용) |
| **향후 활용** | 학교별 학업성취도, 학생수 등 추가 데이터 수집 가능 |

## 환경변수 설정 (.env)

```
# 공공데이터 API 키
NEIS_API_KEY=bafe7d63886249848a49a6525be50833
DISTRICT_ZONE_API_KEY=d8cbe6905b8cbad5111be969515ce18be716fa3dd2e606c9c3f058a52f3bb7f4
SCHOOLINFO_API_KEY=788baf5ec1be40bea09a113cadd239a8
```

## 수집 명령어

```bash
# 전국 중/고등학교 기본정보 수집 (나이스 API)
npx tsx scripts/sync-schools.ts

# 특정 지역만 수집 (예: 서울)
npx tsx scripts/sync-schools.ts --region B10

# 학구도 매핑 (학구ID 업데이트)
npx tsx scripts/sync-school-zones.ts

# 특정 지역만 매핑
npx tsx scripts/sync-school-zones.ts --region B10
```

## DB 현황

| 학교급 | 수량 | 출처 |
|---|---|---|
| 초등학교 | 6,243개 | convention 프로젝트 Supabase |
| 중학교 | 3,319개 | MathLab Supabase (나이스 API) |
| 고등학교 | 2,405개 | MathLab Supabase (나이스 API) |
| **합계** | **11,967개** | |

## 시도교육청 코드 매핑

| ATPT코드 | 시도 | 학구도 cddcCode |
|---|---|---|
| B10 | 서울 | 7010000 |
| C10 | 부산 | 7150000 |
| D10 | 대구 | 7240000 |
| E10 | 인천 | 7310000 |
| F10 | 광주 | 7380000 |
| G10 | 대전 | 7430000 |
| H10 | 울산 | 7480000 |
| I10 | 세종 | (학구도 미제공) |
| J10 | 경기 | 7530000 |
| K10 | 강원 | 7801000 |
| M10 | 충북 | 8000000 |
| N10 | 충남 | 8140000 |
| P10 | 전북 | 8321000 |
| Q10 | 전남 | 8490000 |
| R10 | 경북 | 8750000 |
| S10 | 경남 | 9010000 |
| T10 | 제주 | 9290000 |
