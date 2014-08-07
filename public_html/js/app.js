/*
 * Foundation JavaScript.
 * Documentation can be found at: http://foundation.zurb.com/docs
 */
$(document).foundation({
	orbit: {
		animation: 'slide',
		animation_speed: 700,
		bullets: false,
		navigation_arrows: true,
		next_on_click: false,
		pause_on_hover: true,
		resume_on_mouseout: true,
		slide_number: false,
		timer: true,
		timer_speed: 5000
	}
});

function goBack() {
	$("#slideshow-area").removeClass("force-hide");
	$("#issues-area").addClass("force-hide");

	$("#issue-ifas").removeClass("force-hide");
	$("#issue-cas").removeClass("force-hide");
	$("#issue-research").removeClass("force-hide");
	$("#issue-extension").removeClass("force-hide");
};

function showFilteredFolio(filter) {
	var i;

	console.log(filter);

	if (filter != 'ifas') {
		$("#issue-ifas").addClass("force-hide");
	}
	if (filter != 'cas') {
		$("#issue-cas").addClass("force-hide");
	}
	if (filter != 'research') {
		$("#issue-research").addClass("force-hide");
	}
	if (filter != 'extension') {
		$("#issue-extension").addClass("force-hide");
	}

	/*
	for (i = 0; i < global_list.length; i++) {
			console.log(global_list[i]);
			console.log(global_list[i].filter);
		if (global_list[i].filter == filter) {
			$("#issues-area #issues").append(global_list[i]);
		}
	}
	*/

	$("#slideshow-area").addClass("force-hide");
	$("#issues-area").removeClass("force-hide");
};
