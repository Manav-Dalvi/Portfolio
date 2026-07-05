$(document).ready(function () {

    $('#menu').click(function () {
        $(this).toggleClass('fa-times');
        $('.navbar').toggleClass('nav-toggle');
    });

    $(window).on('scroll load', function () {
        $('#menu').removeClass('fa-times');
        $('.navbar').removeClass('nav-toggle');

        if (window.scrollY > 60) {
            document.querySelector('#scroll-top').classList.add('active');
        } else {
            document.querySelector('#scroll-top').classList.remove('active');
        }
    });

    // isotope category filtering (progressive enhancement over static markup)
    if ($.fn.isotope) {
        var $grid = $('.box-container').isotope({
            itemSelector: '.grid-item',
            layoutMode: 'fitRows'
        });

        $('.button-group').on('click', 'button', function () {
            $('.button-group').find('.is-checked').removeClass('is-checked');
            $(this).addClass('is-checked');
            $grid.isotope({ filter: $(this).attr('data-filter') });
        });
    }

    if (window.VanillaTilt) {
        VanillaTilt.init(document.querySelectorAll(".tilt"), {
            max: 15,
        });
    }
});
