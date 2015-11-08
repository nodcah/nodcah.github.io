/** Super Simple Slider by @intllgnt **/


(function ($, window, document, undefined) {

    $.fn.sss = function (options) {

        // Options

        var settings = $.extend({
            slideShow: true, // Set to false to prevent SSS from automatically animating.
            startOn: 0, // Slide to display first. Uses array notation (0 = first slide).
            transition: 1000, // Length (in milliseconds) of the fade transition.
            speed: 5000, // Slideshow speed in milliseconds.
            showNav: false // Set to false to hide navigation arrows.
        }, options);

        return this.each(function () {

            // Variables

            var
                wrapper = $(this),
                slides = wrapper.children().wrapAll('<div class="sss"/>').addClass('ssslide'),
                slider = wrapper.find('.sss'),
                slide_count = slides.length,
                transition = settings.transition,
                starting_slide = settings.startOn,
                target = starting_slide > slide_count - 1 ? 0 : starting_slide,
                animating = false,
                clicked,
                timer,
                key,
                prev,
                next,

                // Reset Slideshow

                reset_timer = settings.slideShow ? function () {
                    clearTimeout(timer);
                    timer = setTimeout(next_slide, settings.speed);
                } : $.noop;

            // Animate Slider

            function get_width(target) {
                return ((slides.eq(target).width() / slider.height()) * 100) + '%';
            }

            function animate_slide(target) {
                if (!animating) {
                    animating = true;
                    var target_slide = slides.eq(target);

                    target_slide.fadeIn(transition);
                    slides.not(target_slide).fadeOut(transition);

                    slider.animate({
                        paddingleft: get_width(target)
                    }, transition, function () {
                        animating = false;
                    });
                    reset_timer();
                }
            };

            // Next Slide

            function next_slide() {
                target = target === slide_count - 1 ? 0 : target + 1;
                animate_slide(target);
            }

            // Prev Slide

            function prev_slide() {
                target = target === 0 ? slide_count - 1 : target - 1;
                animate_slide(target);
            }

            if (settings.arrows) {
                slider.append('<div class="sssprev"/>', '<div class="sssnext"/>');
            }

            next = slider.find('.sssnext'),
                prev = slider.find('.sssprev');

            $(window).load(function () {


                animate_slide(target);



            });
            // End

        });

    };
})(jQuery, window, document);
