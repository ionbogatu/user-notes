function getShortId() {
    var hrefParts = window.location.href.split("/");

    return hrefParts[hrefParts.length - 1];
}

function reloadNotes() {
    var noteShortId = getShortId();

    var db = firebase.firestore();

    db.collection("MasterNotes").where("shortId", "==", noteShortId).get()
        .then(function (result) {
            if (result.docs[0].id) {
                var data = result.docs[0].data();

                if (data.status === "delete") {
                    showMessage('The record was deleted', 'alert-danger')
                } else {
                    $('.master-note-title span').text(data.name);

                    $notes = $('.table-bordered tbody');
                    $notes.html('');

                    var actions = '<a class="add" title="Add" data-toggle="tooltip"><i class="material-icons">&#xE03B;</i></a>' +
                        '<a class="edit" title="Edit" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a>' +
                        '<a class="delete" title="Delete" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>';

                    for (var note of data.notes) {
                        $notes.append('<tr>' +
                            '<td data-name="label">' + note.label + '</td>' +
                            '<td data-name="note">' + note.note + '</td>' +
                            '<td class="logged-in d-none">' + actions + '</td>' +
                            '</tr>')
                    }

                    if (data.options.op1) {
                        $('#option1').attr('checked', 'checked');
                    }

                    if (data.options.op2) {
                        $('#option2').attr('checked', 'checked');
                    }

                    if (firebase.auth().currentUser) {
                        $('#update').removeClass('d-none');
                        $('#option1').removeAttr("disabled");
                        $('#option2').removeAttr("disabled");
                        $('.logged-in').each(function() {
                            $(this).removeClass('d-none');
                        });
                    } else {
                        $('#update').addClass('d-none');
                        $('#option1').attr("disabled", "disabled");
                        $('#option2').attr("disabled", "disabled");
                        $('.logged-in').each(function() {
                            $(this).addClass('d-none');
                        });
                    }
                }
            }
        })
        .catch(function (error) {
            showMessage('Record does not exist', 'alert-danger');
        });
}

function getLocationOrIP() {
    return new Promise(function (resolve) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            }, function(error) {
                $.getJSON("https://httpbin.org/ip", function(data){
                    if (data && data.origin) {
                        var ips = data.origin.split(', ');

                        if (ips && ips[0]) {
                            resolve(ips[0]);
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            });
        } else {
            $.getJSON("https://httpbin.org/ip", function(data){
                if (data && data.origin) {
                    var ips = data.origin.split(', ');

                    if (ips && ips[0]) {
                        resolve(ips[0]);
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        }
    });
} 

function updateStats() {
    var db = firebase.firestore();

    var masterNotesCollection = db.collection("MasterNotes");
    var masterStatsCollection = db.collection("MasterStats");

    var shortId = getShortId();

    masterNotesCollection.where("shortId", "==", shortId).get()
        .then(function (result) {
            if (result.docs[0].id) {
                masterNotesCollection.doc(result.docs[0].id).update({
                    totalVisits: result.docs[0].data().totalVisits + 1
                }).catch(function (error) {
                    showMessage('Could not update total visits', 'alert-danger')
                });

                const now = new Date();
                var dateCreated = now.getUTCFullYear() + '-' + now.getUTCMonth() + '-' + now.getUTCDate() + ' ' + now.getUTCHours() + ':' + now.getUTCMinutes() + ':' + now.getUTCSeconds();

                getLocationOrIP().then(function(result) {
                    if (typeof result === "string") { // ip
                        masterStatsCollection.add({
                            shortId: shortId,
                            date: dateCreated,
                            ip: result,
                            geo: null
                        });
                    } else { // coords or null
                        masterStatsCollection.add({
                            shortId: shortId,
                            date: dateCreated,
                            ip: null,
                            geo: result
                        });
                    }
                });
            }
        })
        .catch(function (error) {
            showMessage('Could not get the note', 'alert-danger');
        });
} 

function updateNote() {
    if (hasEmptyRows(true)) {
        return;
    }

    var name = ($('.master-note-title-input').length === 1) ? $('.master-note-title-input').val() : $('.master-note-title span').text();

    $('.master-note-title-input').blur();

    showLoader();

    notes = [];

    $('.message').html('');

    if ($('.table-wrapper table tbody tr').length > 0) {
        $('.table-wrapper table tbody tr').each(function() {
            var label = ($(this).find('td input[name="label"]').length === 1) ? $(this).find('td input[name="label"]').val() : $(this).find('td[data-name="label"]').text();
            var note = ($(this).find('td input[name="note"]').length === 1) ? $(this).find('td input[name="note"]').val() : $(this).find('td[data-name="note"]').text();

            notes.push({
                label: escapeHtml(label),
                note: escapeHtml(note),
            });
        });

        var document = {
            name: escapeHtml(name),
            notes: notes,
            options: {
                op1: $('#option1').is(':checked'),
                op2: $('#option2').is(':checked')
            }
        };

        var db = firebase.firestore();

        var shortId = getShortId();

        db.collection("MasterNotes").where("shortId", "==", shortId).get()
            .then(function(result) {
                if (result.docs.length === 1) {
                    db.collection("MasterNotes").doc(result.docs[0].id).update(document)
                        .then(function(result) {
                            showMessage('Note saved', 'alert-success');
                        })
                } else {
                    showMessage('Could not find the note to update', 'alert-danger');
                }

                hideLoader();
            })
            .catch(function(error){
                hideLoader();
                showMessage(error, 'alert-danger');
            });
    }
}

jQuery(document).ready(function ($) {
    updateStats();

    reloadNotes();

    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            $('.nav').hide();
            $('.nav-login').show();
            $('.master-note-title .edit').removeClass('d-none');
        } else {
            $('.nav').show();
            $('.nav-login').hide();
            $('.master-note-title .edit').addClass('d-none');
        }

        reloadNotes();
    });

    $(document).on('click', '.master-note-title', function(event) {
        if (firebase.auth().currentUser) {
            var value = $(this).find('span').text();
            var $input = $('<input type="text" value="' + value + '" class="master-note-title-input">');
            $input.on('blur', function() {
                $(this).parent('div').html('<h2 class="master-note-title d-flex"><span>' + $(this).val() + '</span><a class="edit ml-2" title="Edit" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a></h2>');
            });
            $input.focus();

            $(this).parent().append($input);
            $(this).remove();
        }
    });

    $(".add-new").on('click', function () {
        var actions = '<a class="add" title="Add" data-toggle="tooltip"><i class="material-icons">&#xE03B;</i></a>' +
            '<a class="edit" title="Edit" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a>' +
            '<a class="delete" title="Delete" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>';

        $(this).attr("disabled", "disabled");
        var index = $(".table-wrapper table tbody tr:last-child").index();
        var row = '<tr>' +
            '<td><input type="text" class="form-control" name="label"></td>' +
            '<td><input type="text" class="form-control" name="note"></td>' +
            '<td class="actions">' + actions + '</td>' +
            '</tr>';
        $(".table-wrapper table").append(row);
        $(".table-wrapper table tbody tr").eq(index + 1).find(".add, .delete").show();
        $(".table-wrapper table tbody tr").eq(index + 1).find(".edit").hide();
        $('[data-toggle="tooltip"]').tooltip();
    });

    $(document).on('click', '.add', function() {
        var empty = false;
        var input = $(this).parents("tr").find('input[type="text"]');
        input.each(function(){
            if(!$(this).val()){
                $(this).addClass("error");
                empty = true;
            } else{
                $(this).removeClass("error");
            }
        });
        $(this).parents("tr").find(".error").first().focus();
        if (!empty) {
            $(this).parents("tr").find("td:not(:last-child)").each(function () {
                $(this).attr('data-name', $(this).find('input').attr('name'))
                $(this).html($(this).find('input').val());
            });

            $(this).closest('tr').find(".edit, .delete").show();
            $(this).closest('tr').find(".add").hide();

            if (!hasEmptyRows()) {
                $(".add-new").removeAttr("disabled");
            }
        }
    });

    $(document).on('click', '.edit', function() {
        var inputs = $(this).closest('tr').find("td:not(:last-child)").each(function() {
            $(this).html('<input type="text" class="form-control" name="' + $(this).attr('data-name') + '" value="' + $(this).text() + '">');
        });

        $(this).closest('tr').find(".add, .delete").show();
        $(this).closest('tr').find(".edit").hide();

        $(".add-new").attr("disabled", "disabled");
    });

    $(document).on("click", ".delete", function () {
        $(this).parents("tr").remove();
        $(".add-new").removeAttr("disabled");

        if ($('.table-wrapper tbody tr').length === 0) {
            $('.add-new').click();
        }
    });

    $('#update').on('click', function() {
        if (!hasEmptyRows(true)) {
            updateNote();
        }
    });
});