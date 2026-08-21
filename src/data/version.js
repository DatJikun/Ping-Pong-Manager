// Public product version. The build date belongs to the GitHub Release, not here.
(function(){
  window.PPM=window.PPM||{};
  window.PPM.APP_VERSION='0.1.1';
  window.PPM.APP_CHANNEL='beta';
  window.PPM.appVersionLabel=function(){
    const version=window.PPM.APP_VERSION||'0.1.1';
    const channel=window.PPM.APP_CHANNEL;
    return channel&&channel!=='release'?`${version} ${channel}`:version;
  };
})();
