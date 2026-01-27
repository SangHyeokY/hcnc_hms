export const menuData = [
  {
    title: "Title",
    visible: true,
    children: [
      {
        title: "sample1",
        path: "/sample",
        type: "A",
        visible: true,
      },
      {
        title: "sample2",
        path: "/sample2",
        type: "A",
        visible: true,
      },
      {
        title: "tagList",
        path: "/tagList",
        type: "A",
        visible: true,
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
    title: "DEP_1",
    visible: true,
    children: [
      {
        title: "DEP_2",
        visible: true,
        children: [
          {
            title: "DEP_3",
            path: "/#",
            name: "E110",
            type: "A",
            visible: true,
            filePageCode: "EF110",
          },
          {
            title: "DEP_3_1",
            path: "/#",
            name: "EF110",
            type: "F",
            visible: true,
            parentPage: "E110",
          },
        ],
      },
    ],
  },
  {
    title: "Title",
    path: "/#",
    name: "sample",
    type: "ETC",
    renderPath: "/views/sample.html",
    visible: true,
  },
];
