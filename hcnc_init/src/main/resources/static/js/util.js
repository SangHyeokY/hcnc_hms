export const ajaxUtil = (param, url, successCallback, errorCallback) => {
  $.ajax({
    url: url,
    type: "POST",
    data: param,
    success: (response) => {
      if (successCallback) successCallback(response);
    },
    error: (xhr, status, error) => {
      if (errorCallback) errorCallback(xhr, status, error);
      else alert("error: " + error + "status: " + status + "xhr: " + xhr);
    },
  });
};
