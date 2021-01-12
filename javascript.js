// JavaScript inits and overrides

(function ($) {
  $(function () {
    $('.sidenav').sidenav();
    $('.parallax').parallax();

    $('#nav-mobile').on('click', function () {
      $$.sidenav.sidenav('close');
    });

    $(window).scroll(checkScroll);
    checkScroll();
  }); // end of document ready
})(jQuery); // end of jQuery name space

var $$ = { // Cache
  window: $(window),
  navName: $('#nav-name'),
  sidenav: $('.sidenav')
};
var isAtTopOfPage = false;

function checkScroll() {
  //console.log($(window).scrollTop())
  if (isAtTopOfPage && $$.window.scrollTop() > 170) { //$('#mainname').position().top+$('#mainname').height()) {
    $$.navName.html('Noah&nbsp;Del&nbsp;Coro');
    $$.navName.addClass('fadein');
    $$.navName.removeClass('fadeout');
    isAtTopOfPage = false;
  } else if (!isAtTopOfPage && $$.window.scrollTop() < 170) { //$('#mainname').position().top+$('#mainname').height()) {
    //    $$.navName.text('');
    $$.navName.addClass('fadeout');
    $$.navName.removeClass('fadein');
    isAtTopOfPage = true;
  }
}
