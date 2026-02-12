export const menuData = [

  {
    title: "인력관리",
    visible: true,
    children: [
      {
        title: "기본 인적사항",
        path: "/hr010",
        type: "A",
        visible: true,
      },
      {
        title: "진행 프로젝트 내역",
        path: "/hr020",
        type: "A",
        visible: true,
      },
      {
        title: "인적사항 (상세기능) - 평가 및 리스크 탭",
        path: "/hr015",
        type: "A",
        visible: false,
      },
    ],
  },
  {
    title: "시스템",
    visible: true,
    children: [
      {
        title: "sample1",
        path: "/sample",
        type: "A",
        visible: false,
      },
      {
        title: "sample2",
        path: "/sample2",
        type: "A",
        visible: false,
      },
      {
        title: "tagList",
        path: "/tagList",
        type: "A",
        visible: false,
      },
      {
        title: "공통코드 관리",
        path: "/cm040",
        type: "A",
        visible: true,
      },
      {
        title: "사용자 관리",
        path: "/cm010",
        type: "A",
        visible: true,
      },

    ],
  },



  {
    title: "Title",
    path: "/#",
    name: "sample",
    type: "ETC",
    renderPath: "/views/sample.html",
    visible: false,
  },
];
