export const menuData = [
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
    title: "인력관리",
    visible: true,
    children: [
      {
        title: "기본 인적사항",
        path: "/hr010",
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
