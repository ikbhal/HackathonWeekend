$(document).ready(function() {
 $(".answer").hide();
 
 $(".faq").click(function() {
 	$(this).children(".answer").slideToggle();
 });

});