import AWS from 'aws-sdk';

AWS.config.update({ region: 'us-east-1' });

const sns = new AWS.SNS();

export const handler = async (event) => {
    var body = event;
    var body = JSON.parse(event.body);
    // console.log(body)
    var topicName = body.email.split("@")[0];
    var message = body.message ? body.message : "";
    var subject = "Notification"
    var endPoint = body.email ? body.email : null;

    if (topicName) {
        try {
            // Check if the topic already exists
            const topicsResponse = await sns.listTopics().promise();
            const existingTopics = topicsResponse.Topics || [];

            for (const topic of existingTopics) {
                if (topic.TopicArn.includes(topicName)) {
                    if (endPoint) {
                        // Check if the endpoint is already subscribed to the topic
                        const subscriptions = await sns.listSubscriptionsByTopic({ TopicArn: topic.TopicArn }).promise();
                        const isSubscribed = subscriptions.Subscriptions.some(sub => sub.Endpoint === endPoint && sub.Protocol === 'email');

                        if (!isSubscribed) {
                            await sns.subscribe({
                                Protocol: 'email',
                                TopicArn: topic.TopicArn,
                                Endpoint: endPoint,
                            }).promise();
                        }
                    }

                    // Wrap sns.publish in a promise
                    const publishPromise = new Promise((resolve, reject) => {
                        sns.publish({
                            "Message": message.toString(),
                            "Subject": subject,
                            "TopicArn": topic.TopicArn
                        }, (err, data) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(data);
                            }
                        });
                    });

                    // Wait for sns.publish to complete
                    const publishStatus = await publishPromise;

                    if (publishStatus) {
                        return { success: "Email sent successfully" };
                    } else {
                        return { err: "Unable to send the email" };
                    }
                }
            }
            
            console.log(topicName)

            // If the topic doesn't exist, create it
            const createTopicResponse = await sns.createTopic({ Name: topicName }).promise();
            console.log(createTopicResponse)
            const topicArn = createTopicResponse.TopicArn;
            console.log(topicArn);
            // Subscribe to the topic
            const subscribeResponse = await sns.subscribe({
                Protocol: 'email',
                TopicArn: topicArn,
                Endpoint: endPoint,
            }).promise();

            // Wrap sns.publish in a promise for the new topic
            const publishPromise = new Promise((resolve, reject) => {
                sns.publish({
                    Message: message,
                    Subject: subject,
                    TopicArn: topicArn,
                }, (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });

            // Wait for sns.publish to complete
            const publishStatus = await publishPromise;

            if (publishStatus) {
                return { success: "Email sent successfully" };
            } else {
                return { err: "Unable to send the email" };
            }
        } catch (error) {
            throw error;
        }
    } else {
        return { Error: "Missing hotel name" };
    }
};
