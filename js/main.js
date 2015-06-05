$(document).ready(function(){
	var original;
    $("#logo.subpage").mouseover(function(){
    	original= $(this).attr('src');
        $(this).attr('src','img/adn_animated_croped.png');
    }); 
    $("#logo.subpage").mouseout(function(){
        $(this).attr('src',original);
    });
});