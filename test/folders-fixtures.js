function makeFoldersArray() {
  return [
    {
      id: 1,
      name: "Important"
    },
    {
      id: 2,
      name: "Super"
    },
    {
      id: 3,
      name: "Spangley"
    }
  ];
}

function makeMaliciousFolder() {
  const malicousFolder = {
    id: 1,
    name: "<script>alert('xss');</script>"
  };
  const expectedFolder = {
    id: 1,
    name: "&lt;script&gt;alert('xss');&lt;/script&gt;"
  };
  return {
    malicousFolder,
    expectedFolder
  };
}

module.exports = {
  makeFoldersArray,
  makeMaliciousFolder
};
