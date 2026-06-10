/* Data-driven section rendering: skills, education, experience, projects, certifications */

const DATA_PATH = "./assets/data";

async function fetchData(name) {
    const response = await fetch(`${DATA_PATH}/${name}.json`);
    return response.json();
}

function showSkills(groups) {
    const skillsContainer = document.getElementById("skillsContainer");
    let skillsHTML = "";
    groups.forEach(group => {
        skillsHTML += `<h3 class="group-title">${group.category}</h3><div class="row">`;
        group.skills.forEach(skill => {
            skillsHTML += `
            <div class="bar">
              <div class="info">
                <img src="${skill.icon}" alt="${skill.name} icon" />
                <span>${skill.name}</span>
              </div>
            </div>`;
        });
        skillsHTML += `</div>`;
    });
    skillsContainer.innerHTML = skillsHTML;
}

function showEducation(entries) {
    const educationContainer = document.getElementById("educationContainer");
    let educationHTML = "";
    entries.forEach(entry => {
        educationHTML += `
        <div class="box">
            <div class="image">
                <img draggable="false" src="./assets/images/educat/${entry.image}" alt="${entry.school}">
            </div>
            <div class="content">
                <h3>${entry.degree}</h3>
                <p>${entry.school}</p>
                <h4>${entry.period} | ${entry.status}</h4>
            </div>
        </div>`;
    });
    educationContainer.innerHTML = educationHTML;
}

function showExperience(jobs) {
    const experienceContainer = document.getElementById("experienceContainer");
    let experienceHTML = "";
    jobs.forEach(job => {
        const highlights = job.highlights.map(item => `<li>${item}</li>`).join("");
        const feedback = job.feedback.length ? `
            <h3 class="feedback-title">Performance Feedback:</h3>
            <div class="experience-feedback">
                ${job.feedback.map(tag => `<div class="feedback-tag">${tag}</div>`).join("")}
            </div>` : "";
        experienceHTML += `
        <div class="experience-container">
            <div class="experience-header">
                <h3>${job.company} | ${job.role}</h3>
                <p>${job.location}</p>
                <p>${job.period}</p>
            </div>
            <div class="experience-description">
                <ul>${highlights}</ul>
            </div>
            ${feedback}
        </div>`;
    });
    experienceContainer.innerHTML = experienceHTML;
}

function showProjects(projects) {
    const projectsContainer = document.querySelector("#work .box-container");
    let projectsHTML = "";
    projects.filter(project => project.category != "android").forEach(project => {
        projectsHTML += `
        <div class="box tilt">
      <img draggable="false" src="./assets/images/projects/${project.image}" alt="${project.name}" />
      <div class="content">
        <div class="tag">
        <h3>${project.name}</h3>
        </div>
        <div class="desc">
          <p>${project.desc}</p>
          <div class="btns">
            <a href="${project.links.code}" class="btn" target="_blank">Code <i class="fas fa-code"></i></a>
          </div>
        </div>
      </div>
    </div>`;
    });
    projectsContainer.innerHTML = projectsHTML;
}

function showCertifications(certs) {
    const certsContainer = document.getElementById("certificationsContainer");
    let certsHTML = "";
    certs.forEach(cert => {
        certsHTML += `
        <div class="box">
            <i class="${cert.icon} cert-icon"></i>
            <div class="content">
                <h3>${cert.name}</h3>
                <p>${cert.issuer} | ${cert.date}</p>
                <a href="${cert.link}" class="btn" target="_blank"><span>Verify</span> <i class="fas fa-external-link-alt"></i></a>
            </div>
        </div>`;
    });
    certsContainer.innerHTML = certsHTML;
}

Promise.all([
    fetchData("skills").then(showSkills),
    fetchData("education").then(showEducation),
    fetchData("experience").then(showExperience),
    fetchData("projects").then(showProjects),
    fetchData("certifications").then(showCertifications),
]).then(() => {
    // animations for dynamically injected elements
    VanillaTilt.init(document.querySelectorAll(".tilt"), {
        max: 15,
    });

    const sr = ScrollReveal({
        origin: 'top',
        distance: '80px',
        duration: 1000,
        reset: true
    });
    sr.reveal('.skills .container .bar', { delay: 400 });
    sr.reveal('.education .box', { interval: 200 });
    sr.reveal('.experience .experience-container', { interval: 200 });
    sr.reveal('.work .box', { interval: 200 });
    sr.reveal('.certifications .box', { interval: 200 });
}).catch(error => {
    console.error("Failed to render portfolio data:", error);
});
