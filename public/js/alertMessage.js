$(document).ready(function() {
    $('.form-btn').click(function(e) {
        e.preventDefault();
        $('.modal-window, .modal-overlay').css('display', 'flex');
    });

    $('.modal-btn').click(function() {
        $('.modal-window, .modal-overlay').css('display', 'none');
    });
});