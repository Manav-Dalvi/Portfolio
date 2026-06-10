/* Experience page: navigation and data-driven rendering */

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
});

// fetch and render experience entries
fetch("../assets/data/experience.json")
    .then(response => response.json())
    .then(jobs => {
        const experienceContainer = document.getElementById("experienceContainer");
        let experienceHTML = "";
        jobs.forEach(job => {
            const highlights = job.highlights.map(item => `<li>${item}</li>`).join("");
            const feedback = job.feedback.length ? `
                <span> Feedback Received: </span>
                <div class="experience-feedback">
                    ${job.feedback.map(tag => `<div class="feedback-tag">${tag}</div>`).join("")}
                </div>` : "";
            experienceHTML += `
            <div class="experience-container">
                <div class="experience-header">
                    <h2>${job.company}</h2>
                    <h3>${job.role} | ${job.location}</h3>
                    <p>${job.period}</p>
                </div>
                <div class="experience-description">
                    <ul>${highlights}</ul>
                </div>
                ${feedback}
            </div>`;
        });
        experienceContainer.innerHTML = experienceHTML;

        /* scroll reveal for rendered entries */
        const srtop = ScrollReveal({
            origin: 'top',
            distance: '80px',
            duration: 1000,
            reset: true
        });
        srtop.reveal('.experience .experience-container', { interval: 200 });
    })
    .catch(error => {
        console.error("Failed to render experience data:", error);
    });
