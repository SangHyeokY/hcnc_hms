export const menuData = [
  {
    title: "홈",
    visible: true,
    children: [
      { title: "대시보드", path: "/hr030", type: "A", visible: true },
    ],
  },
  {
    title: "인적 자원",
    visible: true,
    children: [
      { title: "기본 인적사항", path: "/hr010", type: "A", visible: true },
      { title: "프로젝트 내역", path: "/hr020", type: "A", visible: true },
    ],
  },
  {
    title: "시스템",
    visible: true,
    children: [
      { title: "공통코드 관리", path: "/cm040", type: "A", visible: true },
      { title: "사용자 관리", path: "/cm010", type: "A", visible: true },
    ],
  },
  {
    title: "Title1",
    /*path: "/#",*/
    name: "sample",
    type: "ETC",
    /*renderPath: "/views/sample.html",*/
    visible: false,
  },
  {
    title: "Title2",
    /*path: "/#",*/
    name: "sample",
    type: "ETC",
    /*renderPath: "/views/sample2.html",*/
    visible: false,
  },
];